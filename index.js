const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();
// Retrieve command-line arguments
const args = process.argv.slice(2);
const pullNumber = parseInt(args[0], 10); // Pull Request number passed as argument

if (isNaN(pullNumber)) {
  console.error('Invalid pull request number. Please provide a valid number.');
  process.exit(1);
}

// Retrieve GitHub personal access token from environment variable
const githubToken = process.env.GITHUB_TOKEN; // Read token from environment variable

if (!githubToken) {
  console.error(
    'GitHub personal access token is missing. Set the GITHUB_TOKEN environment variable.'
  );
  process.exit(1);
}

const owner = process.env.ORG_NAME;
const repo = process.env.REPO_NAME;

const codeownersUrl = `https://api.github.com/repos/${owner}/${repo}/contents/.github/CODEOWNERS`;
const reviewersApiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/requested_reviewers`;
async function getCodeOwners() {
  try {
    const response = await axios.get(codeownersUrl, {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/vnd.github.v3.raw',
      },
    });

    return response.data;
  } catch (error) {
    console.error(
      'Error fetching CODEOWNERS file:',
      error.response ? error.response.data : error.message
    );
    return null;
  }
}

function parseCodeOwners(codeownersContent) {
  const reviewers = new Set();
  const lines = codeownersContent.split('\n');

  lines.forEach(line => {
    if (line.startsWith('#') || line.trim() === '') return;

    const parts = line.split(/\s+/);

    if (parts.length > 1) {
      parts.slice(1).forEach(user => {
        reviewers.add(user.replace('@', '').trim());
      });
    }
  });

  return Array.from(reviewers);
}

async function addReviewers(reviewers) {
  try {
    const response = await axios.post(
      reviewersApiUrl,
      {
        reviewers: reviewers,
      },
      {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    console.log('Reviewers added successfully:');
  } catch (error) {
    console.error(
      'Error adding reviewers:',
      error.response ? error.response.data : error.message
    );
  }
}

async function main() {
  const codeownersContent = await getCodeOwners();
  if (!codeownersContent) {
    console.error('Failed to retrieve CODEOWNERS file.');
    return;
  }

  const reviewers = parseCodeOwners(codeownersContent);
  console.log('Parsed Reviewers:', reviewers);

  if (reviewers.length === 0) {
    console.error('No reviewers found in CODEOWNERS.');
    return;
  }

  await addReviewers(reviewers.filter(x => x !== process.env.AUTHOR_NAME));
}

main();
