from summit.config.flags import SUMMIT_ACP_ENABLE


class CopilotAcpBackend:
    name = "copilot_acp"
    def __init__(self, permission_broker):
        if not SUMMIT_ACP_ENABLE:
            raise RuntimeError("ACP backend disabled (SUMMIT_ACP_ENABLE=0)")
        self._pb = permission_broker

    async def create_session(self, cwd: str):
        pass

    async def prompt(self, content: list):
        pass

    async def stream_updates(self):
        pass

    async def destroy_session(self):
        pass
