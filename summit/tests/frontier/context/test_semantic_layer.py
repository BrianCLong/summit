from summit.frontier.context.mock_crm import MockCRMProvider
from summit.frontier.context.mock_ticketing import MockTicketingProvider

def test_mock_crm_resolution():
    crm = MockCRMProvider()

    # Test Get
    entity = crm.get_entity("cust_001")
    assert entity is not None
    assert entity.attributes["name"] == "Acme Corp"

    # Test Search
    results = crm.search_entities("Acme")
    assert len(results) == 1
    assert results[0].id == "cust_001"

def test_mock_ticketing_resolution():
    ticketing = MockTicketingProvider()

    # Test Get
    ticket = ticketing.get_entity("tkt_100")
    assert ticket is not None
    assert ticket.related_ids == ["cust_001"]

    # Test Search
    results = ticketing.search_entities("Login")
    assert len(results) == 1
    assert results[0].id == "tkt_100"

def test_cross_system_resolution():
    crm = MockCRMProvider()
    ticketing = MockTicketingProvider()

    ticket = ticketing.get_entity("tkt_100")
    customer_id = ticket.related_ids[0]
    customer = crm.get_entity(customer_id)

    assert customer is not None
    assert customer.attributes["name"] == "Acme Corp"
