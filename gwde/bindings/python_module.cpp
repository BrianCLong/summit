#include <pybind11/numpy.h>
#include <pybind11/pybind11.h>
#include <pybind11/stl.h>

#include <cstring>

#include "gwde/watermark.hpp"

namespace py = pybind11;
using namespace pybind11::literals;

namespace {
py::dict EmbedText(const std::string &text, const std::string &key,
                   std::uint64_t state_seed) {
  auto result = gwde::DualEntropyTextWatermark::Embed(text, key, state_seed);
  py::dict dict;
  dict["watermarked"] = py::str(result.watermarked_text);
  dict["fingerprint"] = result.fingerprint_bits;
  dict["metadata"] = py::dict("version"_a = result.metadata.version,
                               "state_seed"_a = result.metadata.state_seed,
                               "key_hash"_a = result.metadata.key_hash,
                               "fingerprint_length"_a =
                                   result.metadata.fingerprint_length);
  return dict;
}

py::dict EmbedImage(const py::array &array, const std::string &key,
                    std::uint64_t state_seed) {
  py::buffer_info info = array.request();
  if (info.ndim != 2 && info.ndim != 3) {
    throw std::invalid_argument("Image payload must be 2D or 3D array");
  }
  if (info.format != py::format_descriptor<uint8_t>::format()) {
    throw std::invalid_argument("Image payload must be uint8");
  }
  gwde::ImagePayload payload;
  payload.height = static_cast<std::size_t>(info.shape[0]);
  payload.width = static_cast<std::size_t>(info.shape[1]);
  payload.channels = info.ndim == 3 ? static_cast<std::size_t>(info.shape[2]) : 1;
  payload.bytes.resize(info.size);
  std::memcpy(payload.bytes.data(), info.ptr, info.size * sizeof(uint8_t));
  auto result = gwde::DualEntropyImageWatermark::Embed(payload, key, state_seed);
  std::vector<ssize_t> shape;
  if (payload.channels == 1) {
    shape = {static_cast<ssize_t>(payload.height),
             static_cast<ssize_t>(payload.width)};
  } else {
    shape = {static_cast<ssize_t>(payload.height),
             static_cast<ssize_t>(payload.width),
             static_cast<ssize_t>(payload.channels)};
  }
  py::array watermarked(shape, result.payload.bytes.data());
  py::dict dict;
  dict["watermarked"] = watermarked;
  dict["fingerprint"] = result.fingerprint_bits;
  dict["metadata"] = py::dict("version"_a = result.metadata.version,
                               "state_seed"_a = result.metadata.state_seed,
                               "key_hash"_a = result.metadata.key_hash,
                               "fingerprint_length"_a =
                                   result.metadata.fingerprint_length,
                               "height"_a = result.payload.height,
                               "width"_a = result.payload.width,
                               "channels"_a = result.payload.channels);
  return dict;
}

py::dict DetectText(const std::string &text) {
  auto detection = gwde::DualEntropyTextWatermark::Detect(text);
  py::dict dict;
  dict["score"] = detection.score;
  dict["fp"] = detection.false_positive_rate;
  dict["total_bits"] = detection.total_bits;
  dict["matching_bits"] = detection.matching_bits;
  dict["metadata_valid"] = detection.metadata_valid;
  return dict;
}

py::dict DetectImage(const py::array &array) {
  py::buffer_info info = array.request();
  if (info.ndim != 2 && info.ndim != 3) {
    throw std::invalid_argument("Image payload must be 2D or 3D array");
  }
  if (info.format != py::format_descriptor<uint8_t>::format()) {
    throw std::invalid_argument("Image payload must be uint8");
  }
  gwde::ImagePayload payload;
  payload.height = static_cast<std::size_t>(info.shape[0]);
  payload.width = static_cast<std::size_t>(info.shape[1]);
  payload.channels = info.ndim == 3 ? static_cast<std::size_t>(info.shape[2]) : 1;
  payload.bytes.resize(info.size);
  std::memcpy(payload.bytes.data(), info.ptr, info.size * sizeof(uint8_t));
  auto detection = gwde::DualEntropyImageWatermark::Detect(payload);
  py::dict dict;
  dict["score"] = detection.score;
  dict["fp"] = detection.false_positive_rate;
  dict["total_bits"] = detection.total_bits;
  dict["matching_bits"] = detection.matching_bits;
  dict["metadata_valid"] = detection.metadata_valid;
  return dict;
}

}  // namespace

PYBIND11_MODULE(_gwde, m) {
  m.doc() = "GW-DE dual-entropy watermark encoder/detector";
  m.def("embed", [](py::object payload, const std::string &key,
                    std::uint64_t state_seed) {
    if (py::isinstance<py::str>(payload)) {
      return EmbedText(payload.cast<std::string>(), key, state_seed);
    }
    if (py::isinstance<py::array>(payload)) {
      return EmbedImage(payload.cast<py::array>(), key, state_seed);
    }
    throw std::invalid_argument("Unsupported payload type");
  });
  m.def("detect", [](py::object payload) {
    if (py::isinstance<py::str>(payload)) {
      return DetectText(payload.cast<std::string>());
    }
    if (py::isinstance<py::array>(payload)) {
      return DetectImage(payload.cast<py::array>());
    }
    throw std::invalid_argument("Unsupported payload type");
  });
}

