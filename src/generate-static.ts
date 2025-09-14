#!/usr/bin/env node

import { readFile, readdir, writeFile, mkdir } from "fs/promises";
import { join, basename, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEXT_DIR = join(__dirname, "..", "text");
const PUBLIC_DIR = join(__dirname, "..", "public");
const WORKS_DIR = join(PUBLIC_DIR, "works");

interface ShakespeareWork {
  name: string;
  title: string;
  filename: string;
  content?: string;
}

async function loadShakespeareTexts(): Promise<ShakespeareWork[]> {
  const files = await readdir(TEXT_DIR);
  const txtFiles = files.filter(file => file.endsWith(".txt"));

  const texts: ShakespeareWork[] = [];

  for (const file of txtFiles) {
    const name = basename(file, "_TXT_FolgerShakespeare.txt");
    const title = name
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    const content = await readFile(join(TEXT_DIR, file), "utf-8");

    texts.push({
      name,
      title,
      filename: `${name}.html`,
      content
    });
  }

  return texts.sort((a, b) => a.title.localeCompare(b.title));
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function generateStyles(): string {
  return `
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: 'Georgia', 'Times New Roman', serif;
        line-height: 1.6;
        color: #333;
        background: linear-gradient(135deg, #f5f5f5 0%, #fafafa 100%);
        min-height: 100vh;
      }

      .container {
        max-width: 900px;
        margin: 0 auto;
        padding: 20px;
      }

      header {
        background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
        color: white;
        padding: 2rem 0;
        text-align: center;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        margin-bottom: 2rem;
      }

      h1 {
        font-size: 2.5rem;
        margin-bottom: 0.5rem;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      }

      .subtitle {
        font-size: 1.1rem;
        opacity: 0.9;
        font-style: italic;
      }

      .works-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1.5rem;
        padding: 2rem 0;
      }

      .work-card {
        background: white;
        border-radius: 8px;
        padding: 1.5rem;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        text-decoration: none;
        color: inherit;
        display: block;
      }

      .work-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      }

      .work-title {
        color: #2c3e50;
        font-size: 1.3rem;
        margin-bottom: 0.5rem;
      }

      .work-type {
        color: #7f8c8d;
        font-size: 0.9rem;
        font-style: italic;
      }

      .back-link {
        display: inline-block;
        padding: 0.8rem 1.5rem;
        background: #3498db;
        color: white;
        text-decoration: none;
        border-radius: 4px;
        margin-bottom: 2rem;
        transition: background 0.3s ease;
      }

      .back-link:hover {
        background: #2980b9;
      }

      .text-content {
        background: white;
        padding: 3rem;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        font-size: 1.1rem;
        white-space: pre-wrap;
        word-wrap: break-word;
      }

      .search-box {
        margin: 2rem 0;
        padding: 1rem;
        width: 100%;
        font-size: 1.1rem;
        border: 2px solid #ddd;
        border-radius: 4px;
        transition: border-color 0.3s ease;
      }

      .search-box:focus {
        outline: none;
        border-color: #3498db;
      }

      .stats {
        text-align: center;
        padding: 1rem;
        background: white;
        border-radius: 8px;
        margin-bottom: 2rem;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }

      .stats-number {
        font-size: 2rem;
        color: #2c3e50;
        font-weight: bold;
      }

      @media (max-width: 768px) {
        h1 {
          font-size: 2rem;
        }

        .works-grid {
          grid-template-columns: 1fr;
        }

        .text-content {
          padding: 1.5rem;
          font-size: 1rem;
        }
      }
    </style>
  `;
}

function generateIndexPage(works: ShakespeareWork[]): string {
  const categories = {
    Comedy: ['Alls Well That Ends Well', 'As You Like It', 'The Comedy Of Errors', 'Loves Labors Lost', 'Measure For Measure', 'The Merchant Of Venice', 'The Merry Wives Of Windsor', 'A Midsummer Nights Dream', 'Much Ado About Nothing', 'The Taming Of The Shrew', 'Twelfth Night', 'The Two Gentlemen Of Verona', 'The Winters Tale'],
    History: ['King John', 'Richard II', 'Henry IV Part 1', 'Henry IV Part 2', 'Henry V', 'Henry VI Part 1', 'Henry VI Part 2', 'Henry VI Part 3', 'Richard III', 'Henry VIII'],
    Tragedy: ['Antony And Cleopatra', 'Coriolanus', 'Hamlet', 'Julius Caesar', 'King Lear', 'Macbeth', 'Othello', 'Romeo And Juliet', 'Timon Of Athens', 'Titus Andronicus'],
    Romance: ['Cymbeline', 'Pericles', 'The Tempest', 'The Two Noble Kinsmen'],
    Poetry: ['The Passionate Pilgrim', 'The Phoenix And The Turtle', 'The Rape Of Lucrece', 'Shakespeares Sonnets', 'Venus And Adonis']
  };

  function getWorkType(title: string): string {
    for (const [type, titles] of Object.entries(categories)) {
      if (titles.some(t => title === t)) {
        return type;
      }
    }
    return 'Other';
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The Complete Works of William Shakespeare</title>
    <meta name="description" content="Browse and read the complete works of William Shakespeare, including all plays, sonnets, and poems.">
    ${generateStyles()}
</head>
<body>
    <header>
        <div class="container">
            <h1>The Complete Works of William Shakespeare</h1>
            <p class="subtitle">All plays, sonnets, and poems in one place</p>
        </div>
    </header>

    <div class="container">
        <div class="stats">
            <div class="stats-number">${works.length}</div>
            <div>Complete Works Available</div>
        </div>

        <input type="text" class="search-box" id="searchBox" placeholder="Search for a work..." />

        <div class="works-grid" id="worksGrid">
            ${works.map(work => `
                <a href="works/${work.filename}" class="work-card" data-title="${work.title.toLowerCase()}">
                    <h2 class="work-title">${work.title}</h2>
                    <p class="work-type">${getWorkType(work.title)}</p>
                </a>
            `).join('')}
        </div>
    </div>

    <script>
        const searchBox = document.getElementById('searchBox');
        const cards = document.querySelectorAll('.work-card');

        searchBox.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();

            cards.forEach(card => {
                const title = card.dataset.title;
                if (title.includes(searchTerm)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    </script>
</body>
</html>`;
}

function generateWorkPage(work: ShakespeareWork): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${work.title} - William Shakespeare</title>
    <meta name="description" content="Read ${work.title} by William Shakespeare. Complete text from the Folger Shakespeare Library.">
    ${generateStyles()}
</head>
<body>
    <header>
        <div class="container">
            <h1>${work.title}</h1>
            <p class="subtitle">by William Shakespeare</p>
        </div>
    </header>

    <div class="container">
        <a href="../index.html" class="back-link">← Back to All Works</a>

        <div class="text-content">
            ${escapeHtml(work.content || '')}
        </div>
    </div>
</body>
</html>`;
}

async function generateStaticSite() {
  console.log('Loading Shakespeare texts...');
  const works = await loadShakespeareTexts();

  // Create directories
  if (!existsSync(PUBLIC_DIR)) {
    await mkdir(PUBLIC_DIR, { recursive: true });
  }
  if (!existsSync(WORKS_DIR)) {
    await mkdir(WORKS_DIR, { recursive: true });
  }

  // Generate index page
  console.log('Generating index page...');
  const indexHtml = generateIndexPage(works);
  await writeFile(join(PUBLIC_DIR, 'index.html'), indexHtml);

  // Generate individual work pages
  console.log('Generating individual work pages...');
  for (const work of works) {
    const workHtml = generateWorkPage(work);
    await writeFile(join(WORKS_DIR, work.filename), workHtml);
    console.log(`  - Generated ${work.title}`);
  }

  console.log(`\n✨ Static site generated successfully!`);
  console.log(`📁 Output directory: ${PUBLIC_DIR}`);
  console.log(`📚 Total works: ${works.length}`);
}

generateStaticSite().catch((error) => {
  console.error("Error generating static site:", error);
  process.exit(1);
});