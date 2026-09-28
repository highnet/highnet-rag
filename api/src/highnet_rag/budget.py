"""Monthly spend cap and per-IP rate limits. Decisions are surfaced in the `request` stage."""

import hashlib
from dataclasses import dataclass
from typing import Literal

from highnet_rag.config import Settings
from highnet_rag.storage.base import StateStore

Tier = Literal["normal", "degraded", "stopped"]


@dataclass(frozen=True)
class BudgetState:
    spent_usd: float
    cap_usd: float
    tier: Tier

    @property
    def remaining_usd(self) -> float:
        return max(0.0, self.cap_usd - self.spent_usd)

    def as_dict(self) -> dict[str, float | str]:
        return {
            "spent_usd": round(self.spent_usd, 6),
            "cap_usd": self.cap_usd,
            "remaining_usd": round(self.remaining_usd, 6),
            "tier": self.tier,
        }


@dataclass(frozen=True)
class RateState:
    used_minute: int
    used_day: int
    limit_minute: int
    limit_day: int

    @property
    def limited(self) -> bool:
        return self.used_minute >= self.limit_minute or self.used_day >= self.limit_day

    def as_dict(self) -> dict[str, int]:
        return {
            "remaining_minute": max(0, self.limit_minute - self.used_minute),
            "remaining_day": max(0, self.limit_day - self.used_day),
            "limit_minute": self.limit_minute,
            "limit_day": self.limit_day,
        }


def hash_ip(ip: str, settings: Settings) -> str:
    salted = settings.ip_hash_salt.get_secret_value() + ip
    return hashlib.sha256(salted.encode()).hexdigest()[:16]


# snippet: request | Budget tiers
def budget_state(state: StateStore, settings: Settings) -> BudgetState:
    spent = state.month_spend()
    cap = settings.budget_monthly_usd
    if spent >= cap:
        tier: Tier = "stopped"
    elif spent >= cap * settings.budget_degrade_at:
        tier = "degraded"
    else:
        tier = "normal"
    return BudgetState(spent, cap, tier)


# /snippet


def rate_state(state: StateStore, ip_hash: str, settings: Settings) -> RateState:
    return RateState(
        used_minute=state.runs_since(ip_hash, 60),
        used_day=state.runs_since(ip_hash, 86_400),
        limit_minute=settings.rate_limit_per_min,
        limit_day=settings.rate_limit_per_day,
    )
