from modules.sipl.module import SIPLConfig, run_sipl

MODULE_REGISTRY = {
    "sipl": {
        "config_class": SIPLConfig,
        "entrypoint": run_sipl,
    }
}
