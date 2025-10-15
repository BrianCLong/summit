#pragma once

#include <cstddef>
#include <cstdint>
#include <random>
#include <unordered_map>
#include <vector>

#include "field.h"
#include "shamir.h"

namespace ftma {

struct AggregationResult {
  std::vector<double> sum;
  std::vector<double> mean;
  std::vector<double> variance;
  std::size_t participants;
  std::size_t survivors;
  std::size_t threshold;
};

class FtmaCoordinator {
 public:
  FtmaCoordinator(std::size_t num_clients, std::size_t threshold,
                  std::size_t metric_dimension, std::uint64_t scale);

  std::vector<std::uint64_t> RegisterClient(
      std::size_t client_id, const std::vector<double>& metrics);

  AggregationResult Finalize(const std::vector<std::size_t>& active_clients);

  std::size_t dimension() const { return metric_dimension_; }

 private:
  struct ClientState {
    bool registered = false;
    std::vector<std::uint64_t> masked_payload;
    std::vector<std::uint64_t> personal_mask;
    std::unordered_map<std::size_t, std::vector<std::uint64_t>> incoming_shares;
    std::unordered_map<std::size_t, std::uint64_t> pairwise_seeds;
    std::vector<double> original_metrics;
  };

  std::vector<std::uint64_t> BuildPayload(
      const std::vector<double>& metrics, std::vector<std::uint64_t>& personal_mask,
      std::unordered_map<std::size_t, std::uint64_t>& pairwise_seeds,
      std::size_t client_id);

  std::vector<std::uint64_t> GeneratePersonalMask();

  std::vector<std::uint64_t> GeneratePairwiseMask(std::uint64_t seed) const;

  std::size_t num_clients_;
  std::size_t threshold_;
  std::size_t metric_dimension_;
  std::size_t vector_dimension_;
  std::uint64_t scale_;
  std::mt19937_64 prng_;
  Shamir shamir_;
  std::vector<ClientState> clients_;
};

}  // namespace ftma
