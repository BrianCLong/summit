from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, Union

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.alert_event_meta import AlertEventMeta


T = TypeVar("T", bound="AlertEvent")


@_attrs_define
class AlertEvent:
    """
    Attributes:
        id (str): Unique ID of the alert event
        type_ (str): Type of alert (e.g., billing, supply-chain, slo)
        severity (str): Severity of the alert (e.g., critical, warning, info)
        title (str): Short summary of the alert
        ts (float): Timestamp of the alert event in milliseconds (epoch)
        body (Union[Unset, str]): Detailed description of the alert
        meta (Union[Unset, AlertEventMeta]): Additional metadata related to the alert
    """

    id: str
    type_: str
    severity: str
    title: str
    ts: float
    body: Unset | str = UNSET
    meta: Union[Unset, "AlertEventMeta"] = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        type_ = self.type_

        severity = self.severity

        title = self.title

        ts = self.ts

        body = self.body

        meta: Unset | dict[str, Any] = UNSET
        if not isinstance(self.meta, Unset):
            meta = self.meta.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "type": type_,
                "severity": severity,
                "title": title,
                "ts": ts,
            }
        )
        if body is not UNSET:
            field_dict["body"] = body
        if meta is not UNSET:
            field_dict["meta"] = meta

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.alert_event_meta import AlertEventMeta

        d = dict(src_dict)
        id = d.pop("id")

        type_ = d.pop("type")

        severity = d.pop("severity")

        title = d.pop("title")

        ts = d.pop("ts")

        body = d.pop("body", UNSET)

        _meta = d.pop("meta", UNSET)
        meta: Unset | AlertEventMeta
        if isinstance(_meta, Unset):
            meta = UNSET
        else:
            meta = AlertEventMeta.from_dict(_meta)

        alert_event = cls(
            id=id,
            type_=type_,
            severity=severity,
            title=title,
            ts=ts,
            body=body,
            meta=meta,
        )

        alert_event.additional_properties = d
        return alert_event

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
