from typing import Any, Callable, Dict

class FieldInfo:
    def __init__(self, default: Any = None, default_factory: Callable[[], Any] | None = None, **_: Any):
        self.default = default
        self.default_factory = default_factory

def Field(*, default: Any = None, default_factory: Callable[[], Any] | None = None, **_: Any) -> FieldInfo:
    return FieldInfo(default=default, default_factory=default_factory)

def field_validator(*field_names: str):
    def decorator(func: Callable[[Any, Any], Any]):
        setattr(func, "__field_validators__", field_names)
        return func
    return decorator

class BaseModelMeta(type):
    def __init__(cls, name: str, bases: tuple[type, ...], attrs: Dict[str, Any]):
        super().__init__(name, bases, attrs)
        cls.__field_validators__: Dict[str, list[Callable[[Any, Any], Any]]] = {}
        cls.__field_defaults__: Dict[str, FieldInfo] = {}

        for attr_name, attr_value in attrs.items():
            fields = getattr(attr_value, "__field_validators__", None)
            if fields:
                for field in fields:
                    cls.__field_validators__.setdefault(field, []).append(attr_value)

        for attr_name, attr_value in attrs.items():
            if isinstance(attr_value, FieldInfo):
                cls.__field_defaults__[attr_name] = attr_value

class BaseModel(metaclass=BaseModelMeta):
    def __init__(self, **data: Any):
        for key, info in getattr(self.__class__, "__field_defaults__", {}).items():
            if key not in data:
                if info.default_factory is not None:
                    data[key] = info.default_factory()
                else:
                    data[key] = info.default

        validators = getattr(self.__class__, "__field_validators__", {})
        for field, funcs in validators.items():
            if field in data:
                for func in funcs:
                    data[field] = func(self.__class__, data[field])

        for key, value in data.items():
            setattr(self, key, value)

    def dict(self) -> Dict[str, Any]:
        return self.__dict__.copy()

__all__ = ["BaseModel", "Field", "field_validator"]
