import pytest

# Sample Python Test Fixture

def add(a, b):
    return a + b

def test_add():
    assert add(1, 2) == 3

@pytest.mark.asyncio
async def test_async_add():
    async def async_op(x):
        return x + 1
    result = await async_op(1)
    assert result == 2
