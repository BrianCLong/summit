const DecodingMode = {
  Attribute: 0,
  Legacy: 1,
};

class EntityDecoder {
  constructor(_tree, _callback) {
    this._callback = _callback;
  }

  startEntity() {}

  write() {
    return 0;
  }

  end() {
    return 0;
  }
}

module.exports = {
  htmlDecodeTree: {},
  EntityDecoder,
  DecodingMode,
};
