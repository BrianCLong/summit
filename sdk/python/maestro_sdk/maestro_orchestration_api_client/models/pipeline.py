from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="Pipeline")


@_attrs_define
class Pipeline:
    """
    Attributes:
        id (str): Unique ID of the pipeline
        name (str): Name of the pipeline
        version (Union[Unset, str]): Version of the pipeline
        owner (Union[Unset, str]): Owner of the pipeline
    """

    id: str
    name: str
    version: Unset | str = UNSET
    owner: Unset | str = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        name = self.name

        version = self.version

        owner = self.owner

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "name": name,
            }
        )
        if version is not UNSET:
            field_dict["version"] = version
        if owner is not UNSET:
            field_dict["owner"] = owner

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = d.pop("id")

        name = d.pop("name")

        version = d.pop("version", UNSET)

        owner = d.pop("owner", UNSET)

        pipeline = cls(
            id=id,
            name=name,
            version=version,
            owner=owner,
        )

        pipeline.additional_properties = d
        return pipeline

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
