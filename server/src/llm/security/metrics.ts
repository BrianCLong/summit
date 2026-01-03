import { Counter } from 'prom-client';

export const promptFirewallBlocked = new Counter({
  name: 'prompt_firewall_block_total',
  help: 'Total number of prompts blocked by the prompt firewall',
});

export const promptFirewallStrict = new Counter({
  name: 'prompt_firewall_strict_mode_total',
  help: 'Total number of prompts forced into strict mode by the prompt firewall',
});

export const promptFirewallStepUp = new Counter({
  name: 'prompt_firewall_step_up_total',
  help: 'Total number of prompts that require step-up authentication',
});
