import React from 'react'

type Props = { lag?: number }

export const KafkaStatusCard: React.FC<Props> = ({ lag = 0 }) => <div>Kafka Lag: {lag}</div>

export default KafkaStatusCard
