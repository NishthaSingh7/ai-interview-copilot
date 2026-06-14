import logging
import sys


class TraceFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        if not hasattr(record, "otelTraceID"):
            record.otelTraceID = "-"
        if not hasattr(record, "otelSpanID"):
            record.otelSpanID = "-"
        return super().format(record)


def configure_logging(level: str = "INFO") -> None:
    """Console logging with trace/span correlation when OTel logging instrumentor is active."""
    log_level = getattr(logging, level.upper(), logging.INFO)
    root = logging.getLogger()
    root.setLevel(log_level)

    if any(isinstance(h, logging.StreamHandler) for h in root.handlers):
        return

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(log_level)
    handler.setFormatter(
        TraceFormatter(
            "%(asctime)s %(levelname)s [%(name)s] %(message)s"
            " trace_id=%(otelTraceID)s span_id=%(otelSpanID)s"
        )
    )
    root.addHandler(handler)
