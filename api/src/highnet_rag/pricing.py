"""Price table (USD per 1M tokens). Verify against provider pricing pages when changing models;
override without a deploy via PRICE_OVERRIDES='{"model": {"input": 1.0, "output": 5.0}}'."""

from highnet_rag.config import ModelPrice, Settings

DEFAULT_PRICES: dict[str, ModelPrice] = {
    "claude-haiku-4-5": ModelPrice(input=1.0, output=5.0),
    "claude-sonnet-5": ModelPrice(input=2.0, output=10.0),
    "claude-opus-5": ModelPrice(input=5.0, output=25.0),
    "voyage-3.5-lite": ModelPrice(input=0.02),
    "rerank-2.5-lite": ModelPrice(input=0.02),
}

FAKE_PREFIX = "fake-"


class UnknownModelPriceError(KeyError):
    pass


def price_for(model: str, settings: Settings) -> ModelPrice:
    if model in settings.price_overrides:
        return settings.price_overrides[model]
    if model.startswith(FAKE_PREFIX):
        return ModelPrice(input=0.0, output=0.0)
    table = DEFAULT_PRICES
    if model not in table:
        raise UnknownModelPriceError(
            f"No price for model {model!r}; add it to PRICE_OVERRIDES before using it."
        )
    return table[model]


def cost_usd(model: str, settings: Settings, input_tokens: int, output_tokens: int = 0) -> float:
    price = price_for(model, settings)
    return round((input_tokens * price.input + output_tokens * price.output) / 1_000_000, 6)
