"""OpenTelemetry setup: traces, metrics, and logs via OTLP (local LGTM or Grafana Cloud)."""

from __future__ import annotations

import atexit
import base64
import logging
import signal
from typing import TYPE_CHECKING

from opentelemetry import metrics, trace
from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.logging import LoggingInstrumentor
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

if TYPE_CHECKING:
    from fastapi import FastAPI

_logger = logging.getLogger(__name__)

_tracer_provider: TracerProvider | None = None
_meter_provider: MeterProvider | None = None
_logger_provider: LoggerProvider | None = None
_instrumented = False


def grafana_cloud_headers(instance_id: str, token: str) -> dict[str, str]:
    auth = base64.b64encode(f"{instance_id}:{token}".encode()).decode()
    return {"Authorization": f"Basic {auth}"}


def parse_resource_attributes(raw: str) -> dict[str, str]:
    attrs: dict[str, str] = {}
    for part in raw.split(","):
        part = part.strip()
        if not part or "=" not in part:
            continue
        key, value = part.split("=", 1)
        key = key.strip()
        value = value.strip()
        if key:
            attrs[key] = value
    return attrs


def _build_resource(
    service_name: str,
    service_version: str,
    environment: str,
    extra_attributes: dict[str, str] | None = None,
) -> Resource:
    attributes: dict[str, str] = {
        "service.name": service_name,
        "service.version": service_version,
        "deployment.environment": environment,
    }
    if extra_attributes:
        attributes.update(extra_attributes)
    return Resource.create(attributes)


def _otlp_endpoint(base: str, signal: str) -> str:
    base = base.rstrip("/")
    if base.endswith(f"/v1/{signal}"):
        return base
    if base.endswith("/otlp"):
        return f"{base}/v1/{signal}"
    return f"{base}/v1/{signal}"


def shutdown_observability() -> None:
    global _tracer_provider, _meter_provider, _logger_provider

    if _tracer_provider is not None:
        _tracer_provider.shutdown()
        _tracer_provider = None
    if _meter_provider is not None:
        _meter_provider.shutdown()
        _meter_provider = None
    if _logger_provider is not None:
        _logger_provider.shutdown()
        _logger_provider = None


def _register_shutdown_handlers() -> None:
    atexit.register(shutdown_observability)

    def _handle_signal(signum, _frame):
        _logger.info("Received signal %s — flushing telemetry", signum)
        shutdown_observability()

    for sig in (signal.SIGTERM, signal.SIGINT):
        signal.signal(sig, _handle_signal)


def setup_observability(
    app: FastAPI,
    *,
    enabled: bool,
    otlp_endpoint: str,
    service_name: str,
    service_version: str,
    environment: str,
    otlp_headers: dict[str, str] | None = None,
    resource_attributes: dict[str, str] | None = None,
) -> None:
    global _tracer_provider, _meter_provider, _logger_provider, _instrumented

    if not enabled or _instrumented:
        return

    resource = _build_resource(
        service_name,
        service_version,
        environment,
        resource_attributes,
    )
    headers = otlp_headers or {}

    _tracer_provider = TracerProvider(resource=resource)
    _tracer_provider.add_span_processor(
        BatchSpanProcessor(
            OTLPSpanExporter(
                endpoint=_otlp_endpoint(otlp_endpoint, "traces"),
                headers=headers,
            )
        )
    )
    trace.set_tracer_provider(_tracer_provider)

    metric_reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(
            endpoint=_otlp_endpoint(otlp_endpoint, "metrics"),
            headers=headers,
        ),
        export_interval_millis=15_000,
    )
    _meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    metrics.set_meter_provider(_meter_provider)

    _logger_provider = LoggerProvider(resource=resource)
    _logger_provider.add_log_record_processor(
        BatchLogRecordProcessor(
            OTLPLogExporter(
                endpoint=_otlp_endpoint(otlp_endpoint, "logs"),
                headers=headers,
            )
        )
    )

    root_logger = logging.getLogger()
    if not any(isinstance(h, LoggingHandler) for h in root_logger.handlers):
        otel_handler = LoggingHandler(
            level=logging.INFO, logger_provider=_logger_provider
        )
        root_logger.addHandler(otel_handler)

    LoggingInstrumentor().instrument(set_logging_format=True)
    HTTPXClientInstrumentor().instrument()
    FastAPIInstrumentor.instrument_app(app, excluded_urls="/")

    _register_shutdown_handlers()
    _instrumented = True
    _logger.info(
        "Observability enabled — OTLP endpoint=%s service=%s env=%s",
        otlp_endpoint,
        service_name,
        environment,
    )
