import abc


class BaseEvaluator(abc.ABC):
    @property
    @abc.abstractmethod
    def name(self):
        pass

    @property
    @abc.abstractmethod
    def feature_flag(self):
        pass

    @abc.abstractmethod
    def evaluate(self, *args, **kwargs):
        pass
