#pragma once

#include <cstdint>
#include <optional>
#include <string>
#include <tuple>
#include <utility>
#include <vector>

namespace gwde {

struct Metadata {
  uint32_t version{1};
  uint64_t state_seed{0};
  uint64_t key_hash{0};
  uint32_t fingerprint_length{0};
};

struct TextEmbedResult {
  std::string watermarked_text;
  Metadata metadata;
  std::vector<uint8_t> fingerprint_bits;
};

struct ImagePayload {
  std::vector<uint8_t> bytes;
  std::size_t height{0};
  std::size_t width{0};
  std::size_t channels{1};
};

struct ImageEmbedResult {
  ImagePayload payload;
  Metadata metadata;
  std::vector<uint8_t> fingerprint_bits;
};

struct DetectionResult {
  double score{0.0};
  double false_positive_rate{1.0};
  std::size_t total_bits{0};
  std::size_t matching_bits{0};
  bool metadata_valid{false};
};

class DualEntropyTextWatermark {
 public:
  static TextEmbedResult Embed(const std::string &payload, const std::string &key,
                               std::uint64_t state_seed);
  static DetectionResult Detect(const std::string &payload);

 private:
  static Metadata DecodeMetadata(const std::string &payload, std::size_t &offset,
                                 bool &ok);
  static std::string EncodeMetadata(const Metadata &meta);
  static std::vector<uint8_t> ComputeCombinedBits(
      const std::vector<std::string> &tokens, std::uint64_t state_seed,
      std::uint64_t key_hash);
};

class DualEntropyImageWatermark {
 public:
  static ImageEmbedResult Embed(const ImagePayload &payload,
                                const std::string &key,
                                std::uint64_t state_seed);
  static DetectionResult Detect(const ImagePayload &payload);

 private:
  static Metadata ExtractMetadata(const ImagePayload &payload, bool &ok);
  static void InjectMetadata(ImagePayload &payload, const Metadata &meta);
  static std::vector<uint8_t> ComputeCombinedBits(
      const ImagePayload &payload, std::size_t skip_bits,
      std::uint64_t state_seed, std::uint64_t key_hash);
};

std::uint64_t StableHash(const std::string &value);
std::uint64_t StableHash64(std::uint64_t value);

}  // namespace gwde

