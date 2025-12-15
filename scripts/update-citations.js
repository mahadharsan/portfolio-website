// Citation Update Script
// Scrapes Google Scholar profile and updates citation counts in data.js
// Includes rate limiting to avoid being blocked

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GOOGLE_SCHOLAR_URL = 'https://scholar.google.com/citations?user=oUNyeYMAAAAJ&hl=en&oi=ao';
const DATA_FILE = path.join(__dirname, '..', 'data.js');

// Rate limiting: Wait 5 seconds between requests to avoid being blocked
const RATE_LIMIT_DELAY = 5000; // 5 seconds
const MAX_RETRIES = 3;

// Map publication titles to their citation URLs for more reliable scraping
const PUBLICATION_URLS = {
  "Resilience strategies to recover from the cascading ripple effect in a copper supply chain through project management": "https://scholar.google.com/citations?view_op=view_citation&hl=en&user=oUNyeYMAAAAJ&citation_for_view=oUNyeYMAAAAJ:u5HHmVD_uO8C",
  "Environment and economic analysis of reverse supply chain scenarios for remanufacturing using discrete-event simulation approach": "https://scholar.google.com/citations?view_op=view_citation&hl=en&user=oUNyeYMAAAAJ&citation_for_view=oUNyeYMAAAAJ:zYLM7Y9cAGgC",
  "Supply chain routing in a diary industry using heterogeneous fleet system: simulation-based approach": "https://scholar.google.com/citations?view_op=view_citation&hl=en&user=oUNyeYMAAAAJ&citation_for_view=oUNyeYMAAAAJ:9yKSN-GCB0IC",
  "Application of multi grade fuzzy approach to compute the circularity index of manufacturing organizations": "https://scholar.google.com/citations?view_op=view_citation&hl=en&user=oUNyeYMAAAAJ&citation_for_view=oUNyeYMAAAAJ:d1gkVwhDpl0C",
  "Application of dmaic to reduce the rejection rate of starter motor shaft assembly in the automobile industry: a case study": "https://scholar.google.com/citations?view_op=view_citation&hl=en&user=oUNyeYMAAAAJ&citation_for_view=oUNyeYMAAAAJ:Tyk-4Ss8FVUC",
  "A QFD Approach for Selection of Design for Logistics Strategies": "https://scholar.google.com/citations?view_op=view_citation&hl=en&user=oUNyeYMAAAAJ&citation_for_view=oUNyeYMAAAAJ:2osOgNQ5qMEC"
};

// Helper function to delay execution
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        timeout: 30000 // 30 second timeout
      });
      
      if (response.ok) {
        return await response.text();
      } else if (response.status === 429) {
        // Rate limited - wait longer before retry
        const waitTime = Math.pow(2, i) * 10000; // Exponential backoff: 10s, 20s, 40s
        console.warn(`Rate limited. Waiting ${waitTime}ms before retry ${i + 1}/${retries}...`);
        await delay(waitTime);
      }
    } catch (error) {
      console.error(`Attempt ${i + 1}/${retries} failed:`, error.message);
      if (i < retries - 1) {
        const waitTime = Math.pow(2, i) * 2000; // Exponential backoff: 2s, 4s, 8s
        await delay(waitTime);
      }
    }
  }
  return null;
}

async function getCitationCount(url, title) {
  try {
    console.log(`  Fetching citations for: ${title.substring(0, 60)}...`);
    
    const html = await fetchWithRetry(url);
    if (!html) {
      console.warn(`  Could not fetch HTML for ${title.substring(0, 40)}`);
      return null;
    }
    
    const $ = cheerio.load(html);
    
    // Try multiple selectors for citation count (Google Scholar structure may vary)
    const selectors = [
      'div.gsc_oci_value',
      'a.gsc_oci_g_a',
      'div.gsc_value',
      'td.gsc_rsb_std',
      'div.gsc_value_ccl'
    ];
    
    for (const selector of selectors) {
      const elements = $(selector);
      for (let i = 0; i < elements.length; i++) {
        const text = $(elements[i]).text().trim();
        // Look for numbers that could be citation counts
        const match = text.match(/^(\d+)$/);
        if (match) {
          const num = parseInt(match[1]);
          // Citation counts are usually reasonable (less than 10000 for most papers)
          if (num > 0 && num < 10000) {
            return num;
          }
        }
      }
    }
    
    // Alternative: Look for "Cited by X" text
    const citedByMatch = html.match(/Cited by[^\d]*(\d+)/i);
    if (citedByMatch) {
      return parseInt(citedByMatch[1]);
    }
    
    console.warn(`  Could not extract citation count from HTML`);
    return null;
  } catch (error) {
    console.error(`  Error fetching citation for ${title.substring(0, 40)}:`, error.message);
    return null;
  }
}

async function updateCitations() {
  console.log('Starting citation update...');
  console.log(`Rate limiting: ${RATE_LIMIT_DELAY}ms delay between requests\n`);
  
  // Read current data.js file
  let dataContent = fs.readFileSync(DATA_FILE, 'utf8');
  
  // Extract publicationsData array using regex
  const publicationsMatch = dataContent.match(/export const publicationsData = \[([\s\S]*?)\];/);
  if (!publicationsMatch) {
    console.error('Could not find publicationsData in data.js');
    process.exit(1);
  }
  
  // Parse publications to get current citations
  const publications = [];
  const pubPattern = /{\s*title:\s*"([^"]+)",[\s\S]*?citations:\s*(\d+)/g;
  let match;
  while ((match = pubPattern.exec(publicationsMatch[1])) !== null) {
    publications.push({
      title: match[1],
      currentCitations: parseInt(match[2])
    });
  }
  
  console.log(`Found ${publications.length} publications\n`);
  
  // Update citations with rate limiting
  let updated = false;
  let updatedCount = 0;
  
  for (let i = 0; i < publications.length; i++) {
    const pub = publications[i];
    const citationUrl = PUBLICATION_URLS[pub.title];
    
    if (!citationUrl) {
      console.log(`[${i + 1}/${publications.length}] No URL found for: ${pub.title.substring(0, 60)}...`);
      continue;
    }
    
    const newCitations = await getCitationCount(citationUrl, pub.title);
    
    if (newCitations !== null && newCitations !== pub.currentCitations) {
      console.log(`  ✓ Updating: ${pub.currentCitations} → ${newCitations}`);
      // Replace citation count in data.js (escape special regex characters in title)
      const escapedTitle = pub.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const oldPattern = new RegExp(`(title:\\s*"${escapedTitle}"[\\s\\S]*?citations:\\s*)${pub.currentCitations}`, 'g');
      dataContent = dataContent.replace(oldPattern, `$1${newCitations}`);
      updated = true;
      updatedCount++;
    } else if (newCitations === null) {
      console.log(`  ⚠ Could not fetch citations (keeping existing: ${pub.currentCitations})`);
    } else {
      console.log(`  - No change: ${pub.currentCitations}`);
    }
    
    // Rate limiting: Wait before next request (except for last publication)
    if (i < publications.length - 1) {
      console.log(`  Waiting ${RATE_LIMIT_DELAY}ms before next request...\n`);
      await delay(RATE_LIMIT_DELAY);
    }
  }
  
  if (updated) {
    // Write updated data.js
    fs.writeFileSync(DATA_FILE, dataContent, 'utf8');
    console.log(`\n✓ Successfully updated ${updatedCount} citation(s)!`);
  } else {
    console.log('\n✓ No citation updates needed. All citations are up to date.');
  }
}

// Run the update
updateCitations().catch(error => {
  console.error('Error updating citations:', error);
  process.exit(1);
});
