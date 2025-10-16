from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.budget_policy_type import BudgetPolicyType
from ..types import UNSET, Unset

T = TypeVar("T", bound="BudgetPolicy")


@_attrs_define
class BudgetPolicy:
    """
    Attributes:
        type_ (BudgetPolicyType): Type of budget enforcement
        limit (float): Budget limit in USD
        grace (Union[Unset, float]): Grace percentage for soft caps (0.0 - 1.0)
    """

    type_: BudgetPolicyType
    limit: float
    grace: Unset | float = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        type_ = self.type_.value

        limit = self.limit

        grace = self.grace

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "type": type_,
                "limit": limit,
            }
        )
        if grace is not UNSET:
            field_dict["grace"] = grace

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        type_ = BudgetPolicyType(d.pop("type"))

        limit = d.pop("limit")

        grace = d.pop("grace", UNSET)

        budget_policy = cls(
            type_=type_,
            limit=limit,
            grace=grace,
        )

        budget_policy.additional_properties = d
        return budget_policy

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
