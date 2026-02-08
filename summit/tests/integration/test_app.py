def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "products" in response.json()
    assert "factflow" in response.json()["products"]
