"""Every environment variable the app reads, validated once. Mirrors `.env.example`."""

from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class ModelPrice(BaseModel):
    """USD per one million tokens."""

    input: float
    output: float = 0.0


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Providers. Keys are optional at startup; the first stage that needs one fails loudly.
    anthropic_api_key: SecretStr | None = None
    voyage_api_key: SecretStr | None = None
    # Deterministic offline providers (hashed bag-of-words embeddings, extractive "LLM").
    # For local development and tests only; every trace event says provider="fake".
    fake_providers: bool = False

    claude_model_default: str = "claude-haiku-4-5"
    claude_model_demo: str = "claude-opus-5"
    claude_model_judge: str = "claude-sonnet-5"
    demo_mode: bool = False
    max_answer_tokens: int = 1024

    voyage_base_url: str = "https://api.voyageai.com/v1"
    voyage_embed_model: str = "voyage-3.5-lite"
    voyage_rerank_model: str = "rerank-2.5-lite"
    embed_dims: int = 1024
    # Retries on 429/5xx. Keep them short for live questions; the corpus build raises both.
    voyage_max_retries: int = 2
    voyage_max_retry_wait_seconds: float = 10.0

    # Storage
    corpus_db_path: Path = Path("data/corpus.sqlite")
    state_db_path: Path = Path("data/state.sqlite")
    static_dir: Path = Path("web/out")
    evals_results_path: Path = Path("evals/results/latest.json")
    sse_keepalive_seconds: float = 15.0

    # Budget and rate limits
    budget_monthly_usd: float = 20.0
    budget_degrade_at: float = 0.8
    rate_limit_per_min: int = 20
    rate_limit_per_day: int = 200
    ip_hash_salt: SecretStr = SecretStr("dev-only-salt")
    price_overrides: dict[str, ModelPrice] = Field(default_factory=dict)

    # Query limits
    max_query_chars: int = 500
    default_top_k: int = 5
    max_top_k: int = 10
    agent_max_steps: int = 4
    # Input + output tokens across all agent turns of one question (the final answer excluded).
    agent_token_cap: int = 30_000
    agent_turn_max_tokens: int = 512

    # The web app is hosted on Vercel and calls this API cross-origin. Comma-separated exact
    # origins (production domain, `next dev`) plus an optional regex for preview deployments.
    cors_origins: str = ""
    cors_origin_regex: str | None = None

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def answer_model(self) -> str:
        return self.claude_model_demo if self.demo_mode else self.claude_model_default


@lru_cache
def get_settings() -> Settings:
    return Settings()
