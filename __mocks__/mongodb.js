class FakeSession {
  async startTransaction() {}
  async commitTransaction() {}
  async abortTransaction() {}
  async endSession() {}
}

class FakeClient {
  async connect() {}
  async close() {}
  startSession() {
    return new FakeSession();
  }
}

module.exports = {
  MongoClient: FakeClient,
  NativeMongoClient: FakeClient,
};
