#include "protocol.h"

#include <algorithm>
#include <cmath>
#include <stdexcept>
#include <utility>

namespace ftma {

namespace {

std::uint64_t MixSeed(std::uint64_t a, std::uint64_t b, std::uint64_t c) {
  if (a > b) {
    std::swap(a, b);
  }
  std::uint64_t seed = a;
  seed ^= b + 0x9e3779b97f4a7c15ULL + (seed << 6) + (seed >> 2);
  seed ^= c + 0x9e3779b97f4a7c15ULL + (seed << 6) + (seed >> 2);
  return seed;
}

}  // namespace

FtmaCoordinator::FtmaCoordinator(std::size_t num_clients, std::size_t threshold,
                                 std::size_t metric_dimension, std::uint64_t scale)
    : num_clients_(num_clients),
      threshold_(threshold),
      metric_dimension_(metric_dimension),
      vector_dimension_(metric_dimension * 2),
      scale_(scale),
      prng_(std::random_device{}()),
      shamir_(threshold, num_clients),
      clients_(num_clients) {
  if (threshold == 0 || threshold > num_clients) {
    throw std::invalid_argument("Threshold must be between 1 and num_clients");
  }
  if (metric_dimension == 0) {
    throw std::invalid_argument("Metric dimension must be positive");
  }
  if (scale == 0) {
    throw std::invalid_argument("Scale must be non-zero");
  }
}

std::vector<std::uint64_t> FtmaCoordinator::GeneratePersonalMask() {
  std::vector<std::uint64_t> mask(vector_dimension_, 0ULL);
  std::uniform_int_distribution<std::uint64_t> dist(0, Field::kModulus - 1ULL);
  for (auto& value : mask) {
    value = dist(prng_);
  }
  return mask;
}

std::vector<std::uint64_t> FtmaCoordinator::GeneratePairwiseMask(
    std::uint64_t seed) const {
  std::mt19937_64 prng(seed);
  std::uniform_int_distribution<std::uint64_t> dist(0, Field::kModulus - 1ULL);
  std::vector<std::uint64_t> mask(vector_dimension_, 0ULL);
  for (auto& value : mask) {
    value = dist(prng);
  }
  return mask;
}

std::vector<std::uint64_t> FtmaCoordinator::BuildPayload(
    const std::vector<double>& metrics, std::vector<std::uint64_t>& personal_mask,
    std::unordered_map<std::size_t, std::uint64_t>& pairwise_seeds,
    std::size_t client_id) {
  if (metrics.size() != metric_dimension_) {
    throw std::invalid_argument("Metric vector dimension mismatch");
  }
  std::vector<std::uint64_t> scaled(vector_dimension_, 0ULL);
  for (std::size_t i = 0; i < metric_dimension_; ++i) {
    double value = metrics[i];
    double scaled_value = std::round(value * static_cast<double>(scale_));
    int64_t scaled_int = static_cast<int64_t>(scaled_value);
    std::uint64_t field_value = Field::FromSigned(scaled_int);
    scaled[i] = field_value;
    __int128 square_int = static_cast<__int128>(scaled_int) *
                          static_cast<__int128>(scaled_int);
    __int128 modulus = static_cast<__int128>(Field::kModulus);
    square_int %= modulus;
    if (square_int < 0) {
      square_int += modulus;
    }
    scaled[i + metric_dimension_] =
        static_cast<std::uint64_t>(square_int);
  }

  personal_mask = GeneratePersonalMask();

  std::vector<std::vector<std::uint64_t>> mask_shares =
      shamir_.ShareVector(personal_mask, prng_);

  for (std::size_t recipient = 0; recipient < num_clients_; ++recipient) {
    if (recipient == client_id) {
      continue;
    }
    clients_[recipient].incoming_shares[client_id] = mask_shares[recipient];
  }

  std::vector<std::uint64_t> payload = scaled;
  for (std::size_t i = 0; i < vector_dimension_; ++i) {
    payload[i] = Field::Add(payload[i], personal_mask[i]);
  }

  for (std::size_t other = 0; other < num_clients_; ++other) {
    if (other == client_id) {
      continue;
    }
    std::uint64_t seed = MixSeed(static_cast<std::uint64_t>(client_id + 1),
                                 static_cast<std::uint64_t>(other + 1),
                                 static_cast<std::uint64_t>(scale_));
    pairwise_seeds[other] = seed;
    std::vector<std::uint64_t> mask = GeneratePairwiseMask(seed);
    bool client_smaller = client_id < other;
    for (std::size_t i = 0; i < vector_dimension_; ++i) {
      if (client_smaller) {
        payload[i] = Field::Add(payload[i], mask[i]);
      } else {
        payload[i] = Field::Sub(payload[i], mask[i]);
      }
    }
  }

  return payload;
}

std::vector<std::uint64_t> FtmaCoordinator::RegisterClient(
    std::size_t client_id, const std::vector<double>& metrics) {
  if (client_id >= num_clients_) {
    throw std::out_of_range("Client id out of range");
  }
  ClientState& state = clients_[client_id];
  if (state.registered) {
    throw std::runtime_error("Client already registered");
  }
  state.original_metrics = metrics;
  state.masked_payload = BuildPayload(metrics, state.personal_mask,
                                      state.pairwise_seeds, client_id);
  state.registered = true;
  return state.masked_payload;
}

AggregationResult FtmaCoordinator::Finalize(
    const std::vector<std::size_t>& active_clients) {
  if (active_clients.size() < threshold_) {
    throw std::runtime_error("Not enough active clients to satisfy threshold");
  }
  for (std::size_t id : active_clients) {
    if (id >= num_clients_ || !clients_[id].registered) {
      throw std::runtime_error("Active client not registered");
    }
  }
  std::vector<std::uint64_t> aggregate(vector_dimension_, 0ULL);
  std::size_t participants = 0;
  for (std::size_t id = 0; id < num_clients_; ++id) {
    if (!clients_[id].registered) {
      continue;
    }
    ++participants;
    const auto& payload = clients_[id].masked_payload;
    for (std::size_t i = 0; i < vector_dimension_; ++i) {
      aggregate[i] = Field::Add(aggregate[i], payload[i]);
    }
  }

  for (std::size_t id : active_clients) {
    const auto& mask = clients_[id].personal_mask;
    for (std::size_t i = 0; i < vector_dimension_; ++i) {
      aggregate[i] = Field::Sub(aggregate[i], mask[i]);
    }
  }

  std::vector<bool> is_active(num_clients_, false);
  for (std::size_t id : active_clients) {
    is_active[id] = true;
  }

  for (std::size_t dropout = 0; dropout < num_clients_; ++dropout) {
    if (is_active[dropout] || !clients_[dropout].registered) {
      continue;
    }
    std::vector<std::vector<std::uint64_t>> collected;
    std::vector<std::uint64_t> coords;
    collected.reserve(active_clients.size());
    coords.reserve(active_clients.size());
    for (std::size_t id : active_clients) {
      auto it = clients_[id].incoming_shares.find(dropout);
      if (it != clients_[id].incoming_shares.end()) {
        collected.push_back(it->second);
        coords.push_back(static_cast<std::uint64_t>(id + 1));
      }
    }
    if (collected.size() < threshold_) {
      throw std::runtime_error("Insufficient shares to reconstruct dropout mask");
    }
    std::vector<std::vector<std::uint64_t>> truncated(collected.begin(),
                                                      collected.begin() + threshold_);
    std::vector<std::uint64_t> coord_subset(coords.begin(), coords.begin() + threshold_);
    std::vector<std::uint64_t> mask = shamir_.Reconstruct(coord_subset, truncated);
    for (std::size_t i = 0; i < vector_dimension_; ++i) {
      aggregate[i] = Field::Sub(aggregate[i], mask[i]);
    }
  }

  for (std::size_t missing = 0; missing < num_clients_; ++missing) {
    if (clients_[missing].registered || is_active[missing]) {
      continue;
    }
    for (std::size_t id : active_clients) {
      auto seed_it = clients_[id].pairwise_seeds.find(missing);
      if (seed_it == clients_[id].pairwise_seeds.end()) {
        continue;
      }
      std::vector<std::uint64_t> mask_vec = GeneratePairwiseMask(seed_it->second);
      bool survivor_smaller = id < missing;
      for (std::size_t i = 0; i < vector_dimension_; ++i) {
        if (survivor_smaller) {
          aggregate[i] = Field::Sub(aggregate[i], mask_vec[i]);
        } else {
          aggregate[i] = Field::Add(aggregate[i], mask_vec[i]);
        }
      }
    }
  }

  if (participants == 0) {
    throw std::runtime_error("No registered participants to aggregate");
  }

  AggregationResult result;
  result.participants = participants;
  result.survivors = active_clients.size();
  result.threshold = threshold_;
  result.sum.resize(metric_dimension_);
  result.mean.resize(metric_dimension_);
  result.variance.resize(metric_dimension_);

  for (std::size_t i = 0; i < metric_dimension_; ++i) {
    std::uint64_t sum_component = aggregate[i];
    std::uint64_t sumsq_component = aggregate[i + metric_dimension_];
    double sum_value = static_cast<double>(Field::ToSigned(sum_component)) /
                       static_cast<double>(scale_);
    double sumsq_value = static_cast<double>(Field::ToSigned(sumsq_component)) /
                         (static_cast<double>(scale_) * static_cast<double>(scale_));
    result.sum[i] = sum_value;
    double mean = sum_value / static_cast<double>(participants);
    double variance =
        std::max(0.0, sumsq_value / static_cast<double>(participants) -
                           mean * mean);
    result.mean[i] = mean;
    result.variance[i] = variance;
  }

  return result;
}

}  // namespace ftma
