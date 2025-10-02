import type { FC } from 'react'

import type { FliaReport, PlaybookAction } from './types'

type SectionProps = {
  title: string
  items: string[]
}

const ListSection: FC<SectionProps> = ({ title, items }) => {
  if (!items.length) {
    return null
  }

  return (
    <section aria-label={title} className="flia-section">
      <h3>{title}</h3>
      <ul>
        {items.map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

type PlaybookSectionProps = {
  title: string
  actions: PlaybookAction[]
}

const PlaybookSection: FC<PlaybookSectionProps> = ({ title, actions }) => {
  if (!actions.length) {
    return null
  }

  return (
    <section aria-label={`${title} tasks`} className="flia-section">
      <h3>{title}</h3>
      <ol>
        {actions.map(action => (
          <li key={action.id}>
            <strong>{action.description}</strong>
            <div className="flia-action-meta">
              <span className="flia-action-handler">{action.handler}</span>
              {action.args && action.args.length > 0 ? (
                <span className="flia-action-args">{action.args.join(', ')}</span>
              ) : null}
              {action.result ? (
                <code>{JSON.stringify(action.result)}</code>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

type Props = {
  report: FliaReport
}

export const FliaReportView: FC<Props> = ({ report }) => {
  const impactedModels = report.impacted_models.map(model => `${model.name} (${model.id})`)
  const impactedNodes = report.impacted_nodes
    .filter(node => node.type !== 'model')
    .map(node => `${node.type}: ${node.name}`)

  return (
    <article className="flia-report">
      <header>
        <h2>Feature Lineage Impact Report</h2>
        <p>
          Change target: <code>{report.change_id}</code>
        </p>
      </header>

      <ListSection title="Impacted models" items={impactedModels} />
      <ListSection title="Impacted downstream assets" items={impactedNodes} />
      <ListSection title="Metrics at risk" items={report.metrics_at_risk} />
      <ListSection title="Recommended retrain order" items={report.retrain_order} />

      <section aria-label="Change playbook" className="flia-section">
        <h3>Change playbook</h3>
        <PlaybookSection title="Tests" actions={report.playbook.tests} />
        <PlaybookSection title="Backfills" actions={report.playbook.backfills} />
        <PlaybookSection title="Cache invalidations" actions={report.playbook.cache_invalidations} />
      </section>

      {report.playbook_results ? (
        <section aria-label="Playbook execution results" className="flia-section">
          <h3>Execution results</h3>
          <PlaybookSection title="Tests" actions={report.playbook_results.tests} />
          <PlaybookSection title="Backfills" actions={report.playbook_results.backfills} />
          <PlaybookSection
            title="Cache invalidations"
            actions={report.playbook_results.cache_invalidations}
          />
        </section>
      ) : null}
    </article>
  )
}

export default FliaReportView
