"""Resolve OTLP endpoint, auth headers, and resource attributes for observability."""

from __future__ import annotations

import os

from config.settings import (
    GRAFANA_OTLP_ENDPOINT,
    GRAFANA_OTLP_INSTANCE_ID,
    GRAFANA_OTLP_TOKEN,
    OTEL_DEPLOYMENT_ENVIRONMENT,
    OTEL_EXPORTER_OTLP_ENDPOINT,
    OTEL_RESOURCE_ATTRIBUTES,
    OTEL_SERVICE_NAME,
)
from observability.otel import grafana_cloud_headers, parse_resource_attributes


def resolve_otlp_endpoint() -> str:
    if GRAFANA_OTLP_ENDPOINT:
        return GRAFANA_OTLP_ENDPOINT
    return OTEL_EXPORTER_OTLP_ENDPOINT


def resolve_otlp_headers() -> dict[str, str] | None:
    if GRAFANA_OTLP_INSTANCE_ID and GRAFANA_OTLP_TOKEN:
        return grafana_cloud_headers(GRAFANA_OTLP_INSTANCE_ID, GRAFANA_OTLP_TOKEN)
    return None


def resolve_resource_attributes() -> dict[str, str]:
    attrs = parse_resource_attributes(OTEL_RESOURCE_ATTRIBUTES)

    railway_replica = os.getenv("RAILWAY_REPLICA_ID", "").strip()
    railway_deployment = os.getenv("RAILWAY_DEPLOYMENT_ID", "").strip()
    railway_project = os.getenv("RAILWAY_PROJECT_NAME", "").strip()
    railway_service = os.getenv("RAILWAY_SERVICE_NAME", "").strip()

    if railway_replica and "service.instance.id" not in attrs:
        attrs["service.instance.id"] = railway_replica
    if railway_deployment and "railway.deployment.id" not in attrs:
        attrs["railway.deployment.id"] = railway_deployment
    if railway_project and "railway.project.name" not in attrs:
        attrs["railway.project.name"] = railway_project
    if railway_service and "railway.service.name" not in attrs:
        attrs["railway.service.name"] = railway_service
    if OTEL_DEPLOYMENT_ENVIRONMENT and "deployment.environment" not in attrs:
        attrs["deployment.environment"] = OTEL_DEPLOYMENT_ENVIRONMENT
    if OTEL_SERVICE_NAME and "service.name" not in attrs:
        attrs["service.name"] = OTEL_SERVICE_NAME

    return attrs
