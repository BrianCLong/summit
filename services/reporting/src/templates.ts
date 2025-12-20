import fs from 'fs-extra';
import path from 'path';
import Handlebars from 'handlebars';

const TEMPLATES_DIR = path.resolve(process.cwd(), 'reports/templates');

export async function loadTemplate(templateId: string, version: string) {
  const templatePath = path.join(TEMPLATES_DIR, `${templateId}@${version}`);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template ${templateId}@${version} not found`);
  }

  const hbsPath = path.join(templatePath, 'index.hbs');
  if (!fs.existsSync(hbsPath)) {
     throw new Error(`Template source index.hbs not found in ${templatePath}`);
  }

  const hbsContent = await fs.readFile(hbsPath, 'utf-8');
  const cssPath = path.join(templatePath, 'print.css');
  const css = fs.existsSync(cssPath) ? await fs.readFile(cssPath, 'utf-8') : '';

  const template = Handlebars.compile(hbsContent);

  return {
    render: (data: any) => {
      // Inject CSS into data context if needed or handle in template
      return template({ ...data, css });
    }
  };
}
