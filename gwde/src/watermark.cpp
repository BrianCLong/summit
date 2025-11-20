#include "gwde/watermark.hpp"

#include <algorithm>
#include <cmath>
#include <random>
#include <sstream>
#include <stdexcept>

namespace gwde {
namespace {
constexpr char32_t kZeroWidthZero = 0x200B;  // zero width space
constexpr char32_t kZeroWidthOne = 0x200C;   // zero width non-joiner
constexpr char32_t kZeroWidthMetaStart = 0x2063;  // invisible separator
constexpr char32_t kZeroWidthMetaEnd = 0x2064;    // invisible plus

constexpr std::size_t kMetadataBytes = 24;
constexpr std::size_t kMetadataRepeat = 4;
constexpr std::size_t kMetadataBits = kMetadataBytes * 8;
constexpr std::size_t kMetadataPayloadBits = kMetadataBits * kMetadataRepeat;

std::string EncodeZeroWidthBits(const std::vector<uint8_t> &bits,
                                bool include_sentinels = false) {
  std::u32string buffer;
  if (include_sentinels) {
    buffer.push_back(kZeroWidthMetaStart);
  }
  for (auto bit : bits) {
    buffer.push_back(bit ? kZeroWidthOne : kZeroWidthZero);
  }
  if (include_sentinels) {
    buffer.push_back(kZeroWidthMetaEnd);
  }
  std::string utf8;
  for (char32_t code_point : buffer) {
    if (code_point <= 0x7F) {
      utf8.push_back(static_cast<char>(code_point));
    } else if (code_point <= 0x7FF) {
      utf8.push_back(static_cast<char>(0xC0 | ((code_point >> 6) & 0x1F)));
      utf8.push_back(static_cast<char>(0x80 | (code_point & 0x3F)));
    } else {
      utf8.push_back(static_cast<char>(0xE0 | ((code_point >> 12) & 0x0F)));
      utf8.push_back(static_cast<char>(0x80 | ((code_point >> 6) & 0x3F)));
      utf8.push_back(static_cast<char>(0x80 | (code_point & 0x3F)));
    }
  }
  return utf8;
}

std::vector<uint8_t> DecodeZeroWidthBits(const std::string &payload,
                                         std::size_t &offset,
                                         bool with_sentinels = false) {
  std::vector<uint8_t> bits;
  std::size_t i = offset;
  if (with_sentinels) {
    if (i >= payload.size()) return bits;
    unsigned char first = static_cast<unsigned char>(payload[i]);
    char32_t cp = 0;
    std::size_t consumed = 0;
    if (first < 0x80) {
      cp = first;
      consumed = 1;
    } else if ((first & 0xE0) == 0xC0 && i + 1 < payload.size()) {
      cp = ((first & 0x1F) << 6) |
           (static_cast<unsigned char>(payload[i + 1]) & 0x3F);
      consumed = 2;
    } else if ((first & 0xF0) == 0xE0 && i + 2 < payload.size()) {
      cp = ((first & 0x0F) << 12) |
           ((static_cast<unsigned char>(payload[i + 1]) & 0x3F) << 6) |
           (static_cast<unsigned char>(payload[i + 2]) & 0x3F);
      consumed = 3;
    }
    if (cp != kZeroWidthMetaStart) {
      return bits;
    }
    i += consumed;
  }
  while (i < payload.size()) {
    unsigned char first = static_cast<unsigned char>(payload[i]);
    char32_t cp = 0;
    std::size_t consumed = 0;
    if (first < 0x80) {
      cp = first;
      consumed = 1;
    } else if ((first & 0xE0) == 0xC0 && i + 1 < payload.size()) {
      cp = ((first & 0x1F) << 6) |
           (static_cast<unsigned char>(payload[i + 1]) & 0x3F);
      consumed = 2;
    } else if ((first & 0xF0) == 0xE0 && i + 2 < payload.size()) {
      cp = ((first & 0x0F) << 12) |
           ((static_cast<unsigned char>(payload[i + 1]) & 0x3F) << 6) |
           (static_cast<unsigned char>(payload[i + 2]) & 0x3F);
      consumed = 3;
    } else {
      break;
    }
    if (with_sentinels && cp == kZeroWidthMetaEnd) {
      i += consumed;
      break;
    }
    if (cp == kZeroWidthZero) {
      bits.push_back(0);
      i += consumed;
    } else if (cp == kZeroWidthOne) {
      bits.push_back(1);
      i += consumed;
    } else {
      if (!with_sentinels) {
        break;
      }
      i += consumed;
    }
  }
  offset = i;
  return bits;
}

std::string StripZeroWidth(const std::string &payload) {
  std::string cleaned;
  cleaned.reserve(payload.size());
  for (std::size_t i = 0; i < payload.size();) {
    unsigned char first = static_cast<unsigned char>(payload[i]);
    char32_t cp = 0;
    std::size_t consumed = 0;
    if (first < 0x80) {
      cp = first;
      consumed = 1;
    } else if ((first & 0xE0) == 0xC0 && i + 1 < payload.size()) {
      cp = ((first & 0x1F) << 6) |
           (static_cast<unsigned char>(payload[i + 1]) & 0x3F);
      consumed = 2;
    } else if ((first & 0xF0) == 0xE0 && i + 2 < payload.size()) {
      cp = ((first & 0x0F) << 12) |
           ((static_cast<unsigned char>(payload[i + 1]) & 0x3F) << 6) |
           (static_cast<unsigned char>(payload[i + 2]) & 0x3F);
      consumed = 3;
    } else {
      consumed = 1;
      cp = first;
    }
    if (cp != kZeroWidthZero && cp != kZeroWidthOne &&
        cp != kZeroWidthMetaStart && cp != kZeroWidthMetaEnd) {
      for (std::size_t j = 0; j < consumed; ++j) {
        cleaned.push_back(payload[i + j]);
      }
    }
    i += consumed;
  }
  return cleaned;
}

std::vector<std::string> Tokenize(const std::string &payload) {
  std::vector<std::string> tokens;
  std::string current;
  for (unsigned char c : payload) {
    if (std::isspace(c)) {
      if (!current.empty()) {
        tokens.push_back(current);
        current.clear();
      }
    } else {
      current.push_back(static_cast<char>(c));
    }
  }
  if (!current.empty()) {
    tokens.push_back(current);
  }
  return tokens;
}

std::vector<uint8_t> PackMetadata(const Metadata &meta) {
  std::vector<uint8_t> bytes(4 + 8 + 8 + 4);
  auto write_u32 = [](uint32_t value, uint8_t *dst) {
    dst[0] = static_cast<uint8_t>((value >> 24) & 0xFF);
    dst[1] = static_cast<uint8_t>((value >> 16) & 0xFF);
    dst[2] = static_cast<uint8_t>((value >> 8) & 0xFF);
    dst[3] = static_cast<uint8_t>(value & 0xFF);
  };
  auto write_u64 = [](uint64_t value, uint8_t *dst) {
    for (int i = 0; i < 8; ++i) {
      dst[i] = static_cast<uint8_t>((value >> (56 - i * 8)) & 0xFF);
    }
  };
  write_u32(meta.version, bytes.data());
  write_u64(meta.state_seed, bytes.data() + 4);
  write_u64(meta.key_hash, bytes.data() + 12);
  write_u32(meta.fingerprint_length, bytes.data() + 20);
  return bytes;
}

std::optional<Metadata> UnpackMetadata(const std::vector<uint8_t> &bytes) {
  if (bytes.size() != 24) return std::nullopt;
  auto read_u32 = [](const uint8_t *src) -> uint32_t {
    return (static_cast<uint32_t>(src[0]) << 24) |
           (static_cast<uint32_t>(src[1]) << 16) |
           (static_cast<uint32_t>(src[2]) << 8) |
           static_cast<uint32_t>(src[3]);
  };
  auto read_u64 = [](const uint8_t *src) -> uint64_t {
    uint64_t value = 0;
    for (int i = 0; i < 8; ++i) {
      value <<= 8;
      value |= static_cast<uint64_t>(src[i]);
    }
    return value;
  };
  Metadata meta;
  meta.version = read_u32(bytes.data());
  meta.state_seed = read_u64(bytes.data() + 4);
  meta.key_hash = read_u64(bytes.data() + 12);
  meta.fingerprint_length = read_u32(bytes.data() + 20);
  return meta;
}

std::uint64_t HashString64(const std::string &value) {
  std::uint64_t hash = 1469598103934665603ULL;
  for (unsigned char c : value) {
    hash ^= static_cast<std::uint64_t>(c);
    hash *= 1099511628211ULL;
  }
  return hash;
}

}  // namespace

std::uint64_t StableHash(const std::string &value) { return HashString64(value); }
std::uint64_t StableHash64(std::uint64_t value) {
  value ^= value >> 33;
  value *= 0xff51afd7ed558ccdULL;
  value ^= value >> 33;
  value *= 0xc4ceb9fe1a85ec53ULL;
  value ^= value >> 33;
  return value;
}

TextEmbedResult DualEntropyTextWatermark::Embed(const std::string &payload,
                                                 const std::string &key,
                                                 std::uint64_t state_seed) {
  TextEmbedResult result;
  std::string cleaned = StripZeroWidth(payload);
  std::vector<std::string> tokens = Tokenize(cleaned);
  result.metadata.state_seed = state_seed;
  result.metadata.key_hash = StableHash(key);
  result.metadata.fingerprint_length = static_cast<uint32_t>(tokens.size());
  result.metadata.version = 1;
  result.fingerprint_bits = ComputeCombinedBits(tokens, state_seed,
                                                result.metadata.key_hash);

  std::string encoded_meta = EncodeMetadata(result.metadata);
  std::ostringstream builder;
  builder << encoded_meta;

  std::size_t token_index = 0;
  std::string current_token;
  for (std::size_t i = 0; i < cleaned.size(); ++i) {
    unsigned char c = static_cast<unsigned char>(cleaned[i]);
    if (std::isspace(c)) {
      if (!current_token.empty()) {
        builder << current_token;
        if (token_index < result.fingerprint_bits.size()) {
          builder << EncodeZeroWidthBits({result.fingerprint_bits[token_index]});
        }
        current_token.clear();
        ++token_index;
      }
      builder << cleaned[i];
    } else {
      current_token.push_back(static_cast<char>(c));
    }
  }
  if (!current_token.empty()) {
    builder << current_token;
    if (token_index < result.fingerprint_bits.size()) {
      builder << EncodeZeroWidthBits({result.fingerprint_bits[token_index]});
    }
  }
  result.watermarked_text = builder.str();
  return result;
}

DetectionResult DualEntropyTextWatermark::Detect(const std::string &payload) {
  DetectionResult detection;
  std::size_t offset = 0;
  bool meta_ok = false;
  Metadata meta = DecodeMetadata(payload, offset, meta_ok);
  if (!meta_ok || meta.version != 1) {
    detection.metadata_valid = false;
    detection.false_positive_rate = 1.0;
    return detection;
  }
  detection.metadata_valid = true;
  std::string stripped = StripZeroWidth(payload.substr(offset));
  std::vector<std::string> tokens = Tokenize(stripped);
  std::vector<uint8_t> expected = ComputeCombinedBits(tokens, meta.state_seed,
                                                      meta.key_hash);

  std::size_t token_index = 0;
  std::size_t i = offset;
  std::vector<uint8_t> extracted;
  extracted.reserve(tokens.size());
  std::string current;
  for (; i < payload.size();) {
    unsigned char first = static_cast<unsigned char>(payload[i]);
    char32_t cp = 0;
    std::size_t consumed = 0;
    if (first < 0x80) {
      cp = first;
      consumed = 1;
    } else if ((first & 0xE0) == 0xC0 && i + 1 < payload.size()) {
      cp = ((first & 0x1F) << 6) |
           (static_cast<unsigned char>(payload[i + 1]) & 0x3F);
      consumed = 2;
    } else if ((first & 0xF0) == 0xE0 && i + 2 < payload.size()) {
      cp = ((first & 0x0F) << 12) |
           ((static_cast<unsigned char>(payload[i + 1]) & 0x3F) << 6) |
           (static_cast<unsigned char>(payload[i + 2]) & 0x3F);
      consumed = 3;
    } else {
      consumed = 1;
      cp = first;
    }
    if (std::isspace(static_cast<unsigned char>(payload[i]))) {
      if (!current.empty()) {
        current.clear();
      }
      i += consumed;
      continue;
    }
    if (cp == kZeroWidthZero || cp == kZeroWidthOne) {
      if (token_index < tokens.size()) {
        extracted.push_back(cp == kZeroWidthOne ? 1 : 0);
        ++token_index;
      }
      i += consumed;
      continue;
    }
    if (std::isspace(static_cast<unsigned char>(cp))) {
      i += consumed;
      continue;
    }
    current.push_back(static_cast<char>(cp));
    i += consumed;
  }

  detection.total_bits = std::min(expected.size(), extracted.size());
  detection.matching_bits = 0;
  for (std::size_t idx = 0; idx < detection.total_bits; ++idx) {
    if (expected[idx] == extracted[idx]) {
      ++detection.matching_bits;
    }
  }
  if (detection.total_bits == 0) {
    detection.score = 0.0;
    detection.false_positive_rate = 1.0;
    return detection;
  }
  detection.score = static_cast<double>(detection.matching_bits) /
                    static_cast<double>(detection.total_bits);
  double mean = 0.5 * detection.total_bits;
  double variance = 0.25 * detection.total_bits;
  double z = (static_cast<double>(detection.matching_bits) - mean) /
             std::sqrt(variance + 1e-9);
  detection.false_positive_rate = 0.5 * std::erfc(z / std::sqrt(2.0));
  return detection;
}

Metadata DualEntropyTextWatermark::DecodeMetadata(const std::string &payload,
                                                  std::size_t &offset,
                                                  bool &ok) {
  std::size_t local_offset = 0;
  std::vector<uint8_t> bits =
      DecodeZeroWidthBits(payload, local_offset, /*with_sentinels=*/true);
  ok = false;
  Metadata meta;
  if (bits.size() != 24 * 8) {
    offset = 0;
    return meta;
  }
  std::vector<uint8_t> bytes(24);
  for (std::size_t i = 0; i < bits.size(); ++i) {
    std::size_t byte_index = i / 8;
    bytes[byte_index] <<= 1;
    bytes[byte_index] |= bits[i] & 0x1;
  }
  auto unpacked = UnpackMetadata(bytes);
  if (!unpacked.has_value()) {
    offset = 0;
    return meta;
  }
  meta = unpacked.value();
  ok = true;
  offset = local_offset;
  return meta;
}

std::string DualEntropyTextWatermark::EncodeMetadata(const Metadata &meta) {
  std::vector<uint8_t> bytes = PackMetadata(meta);
  std::vector<uint8_t> bits;
  bits.reserve(bytes.size() * 8);
  for (auto byte : bytes) {
    for (int bit = 7; bit >= 0; --bit) {
      bits.push_back((byte >> bit) & 0x1);
    }
  }
  return EncodeZeroWidthBits(bits, /*include_sentinels=*/true);
}

std::vector<uint8_t> DualEntropyTextWatermark::ComputeCombinedBits(
    const std::vector<std::string> &tokens, std::uint64_t state_seed,
    std::uint64_t key_hash) {
  std::vector<uint8_t> bits;
  bits.reserve(tokens.size());
  std::mt19937_64 rng(state_seed ^ key_hash);
  for (std::size_t idx = 0; idx < tokens.size(); ++idx) {
    std::uint64_t content = StableHash(tokens[idx] + std::to_string(idx));
    std::uint8_t content_bit = static_cast<std::uint8_t>(content & 0x1ULL);
    std::uint8_t state_bit = static_cast<std::uint8_t>(rng() & 0x1ULL);
    bits.push_back(static_cast<uint8_t>((content_bit ^ state_bit) & 0x1));
  }
  return bits;
}

ImageEmbedResult DualEntropyImageWatermark::Embed(const ImagePayload &payload,
                                                  const std::string &key,
                                                  std::uint64_t state_seed) {
  if (payload.bytes.empty() || payload.width * payload.height * payload.channels == 0) {
    throw std::invalid_argument("Image payload is empty");
  }
  ImageEmbedResult result;
  result.payload = payload;
  result.metadata.version = 1;
  result.metadata.state_seed = state_seed;
  result.metadata.key_hash = StableHash(key);
  const std::size_t total_pixels = payload.height * payload.width * payload.channels;
  const std::size_t metadata_bits = kMetadataPayloadBits;
  if (total_pixels <= metadata_bits) {
    throw std::invalid_argument("Image too small for metadata encoding");
  }
  std::size_t fingerprint_bits = total_pixels - metadata_bits;
  result.metadata.fingerprint_length = static_cast<uint32_t>(fingerprint_bits);
  result.fingerprint_bits = ComputeCombinedBits(payload, metadata_bits, state_seed,
                                                result.metadata.key_hash);
  ImagePayload watermarked = payload;
  InjectMetadata(watermarked, result.metadata);
  for (std::size_t i = 0; i < fingerprint_bits; ++i) {
    std::size_t pixel_index = i + metadata_bits;
    uint8_t bit = result.fingerprint_bits[i];
    watermarked.bytes[pixel_index] &= 0xFE;
    watermarked.bytes[pixel_index] |= bit;
  }
  result.payload = std::move(watermarked);
  return result;
}

DetectionResult DualEntropyImageWatermark::Detect(const ImagePayload &payload) {
  DetectionResult detection;
  if (payload.bytes.empty() || payload.width * payload.height * payload.channels == 0) {
    detection.metadata_valid = false;
    return detection;
  }
  bool ok = false;
  Metadata meta = ExtractMetadata(payload, ok);
  if (!ok || meta.version != 1) {
    detection.metadata_valid = false;
    detection.false_positive_rate = 1.0;
    return detection;
  }
  detection.metadata_valid = true;
  const std::size_t total_pixels = payload.height * payload.width * payload.channels;
  const std::size_t metadata_bits = kMetadataPayloadBits;
  if (total_pixels <= metadata_bits || meta.fingerprint_length > total_pixels - metadata_bits) {
    detection.false_positive_rate = 1.0;
    return detection;
  }
  std::vector<uint8_t> expected = ComputeCombinedBits(payload, metadata_bits,
                                                      meta.state_seed, meta.key_hash);
  std::vector<uint8_t> extracted;
  extracted.reserve(meta.fingerprint_length);
  for (std::size_t i = 0; i < meta.fingerprint_length; ++i) {
    std::size_t pixel_index = i + metadata_bits;
    extracted.push_back(payload.bytes[pixel_index] & 0x1);
  }
  detection.total_bits = std::min(extracted.size(), expected.size());
  detection.matching_bits = 0;
  for (std::size_t i = 0; i < detection.total_bits; ++i) {
    if (extracted[i] == expected[i]) {
      ++detection.matching_bits;
    }
  }
  if (detection.total_bits == 0) {
    detection.score = 0.0;
    detection.false_positive_rate = 1.0;
    return detection;
  }
  detection.score = static_cast<double>(detection.matching_bits) /
                    static_cast<double>(detection.total_bits);
  double mean = 0.5 * detection.total_bits;
  double variance = 0.25 * detection.total_bits;
  double z = (static_cast<double>(detection.matching_bits) - mean) /
             std::sqrt(variance + 1e-9);
  detection.false_positive_rate = 0.5 * std::erfc(z / std::sqrt(2.0));
  return detection;
}

Metadata DualEntropyImageWatermark::ExtractMetadata(const ImagePayload &payload,
                                                    bool &ok) {
  const std::size_t metadata_bits = kMetadataPayloadBits;
  if (payload.bytes.size() < metadata_bits) {
    ok = false;
    return Metadata{};
  }
  std::vector<uint8_t> bits;
  bits.reserve(metadata_bits);
  for (std::size_t i = 0; i < metadata_bits && i < payload.bytes.size(); ++i) {
    bits.push_back(payload.bytes[i] & 0x1);
  }
  std::vector<uint8_t> majority_bits(kMetadataBits, 0);
  for (std::size_t bit = 0; bit < kMetadataBits; ++bit) {
    std::size_t ones = 0;
    for (std::size_t rep = 0; rep < kMetadataRepeat; ++rep) {
      std::size_t slot = bit * kMetadataRepeat + rep;
      if (slot < bits.size()) {
        ones += bits[slot] & 0x1;
      }
    }
    majority_bits[bit] = static_cast<uint8_t>(ones > kMetadataRepeat / 2 ? 1 : 0);
  }
  std::vector<uint8_t> bytes(24, 0);
  for (std::size_t i = 0; i < majority_bits.size(); ++i) {
    bytes[i / 8] <<= 1;
    bytes[i / 8] |= majority_bits[i] & 0x1;
  }
  auto meta = UnpackMetadata(bytes);
  ok = meta.has_value();
  if (ok) {
    return meta.value();
  }
  return Metadata{};
}

void DualEntropyImageWatermark::InjectMetadata(ImagePayload &payload,
                                               const Metadata &meta) {
  const std::size_t metadata_bits = kMetadataPayloadBits;
  std::vector<uint8_t> bytes = PackMetadata(meta);
  std::vector<uint8_t> bits;
  bits.reserve(bytes.size() * 8);
  for (auto byte : bytes) {
    for (int bit = 7; bit >= 0; --bit) {
      bits.push_back((byte >> bit) & 0x1);
    }
  }
  for (std::size_t bit_index = 0; bit_index < kMetadataBits; ++bit_index) {
    for (std::size_t rep = 0; rep < kMetadataRepeat; ++rep) {
      std::size_t slot = bit_index * kMetadataRepeat + rep;
      if (slot >= payload.bytes.size()) {
        return;
      }
      payload.bytes[slot] &= 0xFE;
      payload.bytes[slot] |= bits[bit_index];
    }
  }
}

std::vector<uint8_t> DualEntropyImageWatermark::ComputeCombinedBits(
    const ImagePayload &payload, std::size_t skip_bits,
    std::uint64_t state_seed, std::uint64_t key_hash) {
  std::vector<uint8_t> bits;
  const std::size_t total_pixels = payload.height * payload.width * payload.channels;
  if (total_pixels <= skip_bits) {
    return bits;
  }
  bits.reserve(total_pixels - skip_bits);
  std::mt19937_64 rng(state_seed ^ key_hash);
  for (std::size_t idx = skip_bits; idx < total_pixels; ++idx) {
    uint64_t mix = (static_cast<uint64_t>(payload.bytes[idx]) << 32) ^
                   static_cast<uint64_t>(idx);
    uint8_t content_bit = static_cast<uint8_t>(StableHash64(mix) & 0x1ULL);
    uint8_t state_bit = static_cast<uint8_t>(rng() & 0x1ULL);
    bits.push_back(static_cast<uint8_t>((content_bit ^ state_bit) & 0x1));
  }
  return bits;
}

}  // namespace gwde

