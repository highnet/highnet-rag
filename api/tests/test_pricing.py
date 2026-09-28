import pytest

from highnet_rag.config import Settings
from highnet_rag.pricing import UnknownModelPriceError, cost_usd


def test_cost_uses_per_million_prices() -> None:
    s = Settings(_env_file=None)  # pyright: ignore[reportCallIssue]
    assert cost_usd("claude-haiku-4-5", s, 1_000_000, 100_000) == pytest.approx(1.5)


def test_unknown_model_is_an_error_not_a_free_call() -> None:
    with pytest.raises(UnknownModelPriceError):
        cost_usd("mystery-model", Settings(_env_file=None), 10)  # pyright: ignore[reportCallIssue]
