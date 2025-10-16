import React from 'react';
import Link from '@docusaurus/Link';

export default function IntegrationsGrid({
  items,
}: {
  items: { slug: string; label: string }[];
}) {
  return (
    <div className="margin-top--lg">
      <h3>Integrations</h3>
      <div className="row">
        {items.map((item) => (
          <div key={item.slug} className="col col--4 margin-bottom--md">
            <div className="card">
              <div className="card__header">
                <h4>{item.label}</h4>
              </div>
              <div className="card__body">
                <p>Quickly integrate with {item.label} functionality.</p>
              </div>
              <div className="card__footer">
                <Link
                  to={item.slug}
                  className="button button--primary button--block"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
