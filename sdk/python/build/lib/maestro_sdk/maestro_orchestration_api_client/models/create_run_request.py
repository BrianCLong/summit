from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="CreateRunRequest")


@_attrs_define
class CreateRunRequest:
    """
    Attributes:
        pipeline_id (str): ID of the pipeline to run
        estimated_cost (float): Estimated cost of the run for budget checks
    """

    pipeline_id: str
    estimated_cost: float
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        pipeline_id = self.pipeline_id

        estimated_cost = self.estimated_cost

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "pipelineId": pipeline_id,
                "estimatedCost": estimated_cost,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        pipeline_id = d.pop("pipelineId")

        estimated_cost = d.pop("estimatedCost")

        create_run_request = cls(
            pipeline_id=pipeline_id,
            estimated_cost=estimated_cost,
        )

        create_run_request.additional_properties = d
        return create_run_request

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
