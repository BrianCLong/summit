from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, Union

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.budget_policy import BudgetPolicy


T = TypeVar("T", bound="Budget")


@_attrs_define
class Budget:
    """
    Attributes:
        tenant (str): Tenant ID
        monthly_usd (float): Monthly budget in USD
        current_spend (Union[Unset, float]): Current spend for the month in USD
        policy (Union[Unset, BudgetPolicy]):
    """

    tenant: str
    monthly_usd: float
    current_spend: Unset | float = UNSET
    policy: Union[Unset, "BudgetPolicy"] = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        tenant = self.tenant

        monthly_usd = self.monthly_usd

        current_spend = self.current_spend

        policy: Unset | dict[str, Any] = UNSET
        if not isinstance(self.policy, Unset):
            policy = self.policy.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "tenant": tenant,
                "monthlyUsd": monthly_usd,
            }
        )
        if current_spend is not UNSET:
            field_dict["currentSpend"] = current_spend
        if policy is not UNSET:
            field_dict["policy"] = policy

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.budget_policy import BudgetPolicy

        d = dict(src_dict)
        tenant = d.pop("tenant")

        monthly_usd = d.pop("monthlyUsd")

        current_spend = d.pop("currentSpend", UNSET)

        _policy = d.pop("policy", UNSET)
        policy: Unset | BudgetPolicy
        if isinstance(_policy, Unset):
            policy = UNSET
        else:
            policy = BudgetPolicy.from_dict(_policy)

        budget = cls(
            tenant=tenant,
            monthly_usd=monthly_usd,
            current_spend=current_spend,
            policy=policy,
        )

        budget.additional_properties = d
        return budget

    @property
    def additional_keys(self) -> list[str]:
        return list(self.additional_properties.keys())

    def __getitem__(self, key: str) -> Any:
        return self.additional_properties[key]

    def __setitem__(self, key: str, value: Any) -> None:
        self.additional_properties[key] = value

    def __delitem__(self, key: str) -> None:
        del self.additional_properties[key]

    def __contains__(self, key: str) -> bool:
        return key in self.additional_properties
