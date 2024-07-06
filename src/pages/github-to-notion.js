import { Client } from '@notionhq/client';
import { Octokit } from '@octokit/rest';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { owner, repo, workflow_id } = req.body;

      // Obtener las ejecuciones del workflow de GitHub
      const { data: runs } = await octokit.actions.listWorkflowRuns({
        owner,
        repo,
        workflow_id,
      });

      // Enviar cada ejecución a Notion
      for (const run of runs.workflow_runs) {
        await notion.pages.create({
          parent: { database_id: process.env.NOTION_DATABASE_ID },
          properties: {
            Name: {
              title: [{ text: { content: `${repo} - Run #${run.run_number}` } }],
            },
            Status: { select: { name: run.status } },
            Conclusion: { select: { name: run.conclusion || 'N/A' } },
            'Created At': { date: { start: run.created_at } },
            'Updated At': { date: { start: run.updated_at } },
            URL: { url: run.html_url },
          },
        });
      }

      res.status(200).json({ message: 'Data sent to Notion successfully' });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Error sending data to Notion' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}