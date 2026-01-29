import { BaseEnvironment } from '../env';
import { Observation, Action, StepResult } from '../types';

export class BrowserOpsEnvironment extends BaseEnvironment {
  public name = 'BrowserOps';
  private currentUrl: string = 'about:blank';
  private pageContent: string = '<html><body></body></html>';

  protected async _reset(options?: Record<string, any>): Promise<Observation> {
    this.currentUrl = options?.url || 'https://internal.summit.corp/dashboard';
    this.pageContent = this.generateContent(this.currentUrl);
    return this.getObservation();
  }

  protected async _step(action: Action): Promise<StepResult> {
    let success = true;
    let message = 'Action completed';
    const reward = 0;

    switch (action.type) {
      case 'goto':
        this.currentUrl = action.params.url;
        this.pageContent = this.generateContent(this.currentUrl);
        message = `Navigated to ${this.currentUrl}`;
        break;
      case 'click':
        // Mock click
        if (action.params.selector) {
           message = `Clicked ${action.params.selector}`;
           // Simulate state change if it's a specific button
           if (action.params.selector === '#login-btn') {
             this.currentUrl = 'https://internal.summit.corp/home';
             this.pageContent = this.generateContent(this.currentUrl);
           }
        } else {
            success = false;
            message = 'Missing selector';
        }
        break;
      case 'type':
        if (action.params.selector && action.params.text) {
          message = `Typed "${action.params.text}" into ${action.params.selector}`;
        } else {
          success = false;
          message = 'Missing selector or text';
        }
        break;
      default:
        success = false;
        message = `Unknown action type: ${action.type}`;
    }

    return {
      observation: this.getObservation(),
      feedback: { success, message, reward },
      done: false,
      info: { url: this.currentUrl }
    };
  }

  private getObservation(): Observation {
    return {
      type: 'mixed',
      content: {
        url: this.currentUrl,
        dom: this.pageContent
      },
      timestamp: Date.now()
    };
  }

  private generateContent(url: string): string {
    if (url.includes('dashboard')) {
      return '<html><body><h1>Admin Dashboard</h1><form><input id="search" /><button id="search-btn">Search</button></form></body></html>';
    } else if (url.includes('home')) {
      return '<html><body><h1>Welcome Home</h1><a href="/profile">Profile</a></body></html>';
    }
    return '<html><body><h1>404 Not Found</h1></body></html>';
  }
}
