import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from dateutil.parser import isoparse

from ..types import UNSET, Unset

T = TypeVar("T", bound="Run")


@_attrs_define
class Run:
    """
    Attributes:
        id (str): Unique ID of the run
        pipeline (str): Name of the pipeline executed
        status (str): Current status of the run (e.g., Queued, Running, Succeeded, Failed)
        duration_ms (Union[Unset, float]): Duration of the run in milliseconds
        cost (Union[Unset, float]): Cost incurred by the run in USD
        created_at (Union[Unset, datetime.datetime]): Timestamp when the run was created
        trace_id (Union[None, Unset, str]): OpenTelemetry Trace ID associated with the run
    """

    id: str
    pipeline: str
    status: str
    duration_ms: Unset | float = UNSET
    cost: Unset | float = UNSET
    created_at: Unset | datetime.datetime = UNSET
    trace_id: None | Unset | str = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        pipeline = self.pipeline

        status = self.status

        duration_ms = self.duration_ms

        cost = self.cost

        created_at: Unset | str = UNSET
        if not isinstance(self.created_at, Unset):
            created_at = self.created_at.isoformat()

        trace_id: None | Unset | str
        if isinstance(self.trace_id, Unset):
            trace_id = UNSET
        else:
            trace_id = self.trace_id

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "pipeline": pipeline,
                "status": status,
            }
        )
        if duration_ms is not UNSET:
            field_dict["durationMs"] = duration_ms
        if cost is not UNSET:
            field_dict["cost"] = cost
        if created_at is not UNSET:
            field_dict["createdAt"] = created_at
        if trace_id is not UNSET:
            field_dict["traceId"] = trace_id

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = d.pop("id")

        pipeline = d.pop("pipeline")

        status = d.pop("status")

        duration_ms = d.pop("durationMs", UNSET)

        cost = d.pop("cost", UNSET)

        _created_at = d.pop("createdAt", UNSET)
        created_at: Unset | datetime.datetime
        if isinstance(_created_at, Unset):
            created_at = UNSET
        else:
            created_at = isoparse(_created_at)

        def _parse_trace_id(data: object) -> None | Unset | str:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | Unset | str, data)

        trace_id = _parse_trace_id(d.pop("traceId", UNSET))

        run = cls(
            id=id,
            pipeline=pipeline,
            status=status,
            duration_ms=duration_ms,
            cost=cost,
            created_at=created_at,
            trace_id=trace_id,
        )

        run.additional_properties = d
        return run

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
