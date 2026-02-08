from safety.sandbox.runner import load_policy, net_http_get, net_http_post


def http_get(url: str, approved: bool = False) -> dict:
    return net_http_get(url, approved, load_policy())


def http_post(url: str, data: dict, approved: bool = False) -> dict:
    return net_http_post(url, data, approved, load_policy())
