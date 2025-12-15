# Automate Google Scholar Citation Updates

## Overview
Set up automatic citation updates from Google Scholar using GitHub Actions. The system will scrape citation counts weekly, update the publications data, and trigger a Netlify rebuild.

## Files to Create

1. **`.github/workflows/update-citations.yml`** - GitHub Actions workflow
   - Runs weekly (every Monday)
   - Executes citation update script
   - Commits and pushes updated data.js if changes detected
   - Triggers Netlify rebuild automatically

2. **`scripts/update-citations.js`** - Citation update script
   - Scrapes Google Scholar profile page
   - Extracts citation counts for each publication
   - Updates publicationsData in data.js
   - Handles errors gracefully with fallbacks
   - Logs results

3. **`scripts/package.json`** (or update root package.json) - Add dependencies
   - Add `puppeteer` or `cheerio` for web scraping
   - Add `node-fetch` for HTTP requests
   - Add `fs` and path utilities

## Files to Modify

1. **`data.js`** - Add all publications from Google Scholar
   - Add 6 publications with current structure:
     - title, authors, venue, year, url, citations
   - Structure publicationsData array with all entries
   - Include Google Scholar profile URL for reference

2. **`package.json`** - Add scripts and dependencies
   - Add script: `"update-citations": "node scripts/update-citations.js"`
   - Add dependencies: `puppeteer` (or `cheerio` + `node-fetch`)

3. **`.gitignore`** - Ignore temporary files
   - Add `scripts/.cache/` if using caching
   - Add any temp files from scraping

## Implementation Details

### GitHub Actions Workflow Structure:
```yaml
name: Update Citations
on:
  schedule:
    - cron: '0 0 * * 1'  # Every Monday at midnight UTC
  workflow_dispatch:  # Manual trigger option

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Setup Node.js
      - Install dependencies
      - Run citation update script
      - Commit and push if changes
```

### Citation Update Script Approach:
- **Option A (Puppeteer)**: Full browser automation, more reliable but heavier
- **Option B (Cheerio + fetch)**: Lightweight HTML parsing, faster but may break if structure changes
- **Recommendation**: Start with Cheerio (lighter), fallback to manual if needed

### Error Handling:
- Try-catch around scraping logic
- If scraping fails, keep existing citation counts
- Log errors to GitHub Actions logs
- Don't fail the workflow if update fails (non-blocking)

### Data Structure:
Each publication needs:
- `title`: Publication title
- `authors`: Author list (string)
- `venue`: Journal/Conference name
- `year`: Publication year
- `url`: Link to publication
- `citations`: Citation count (will be updated automatically)
- `scholarUrl`: Optional - Google Scholar citation link for scraping

## Publications to Add (from Google Scholar):

1. "Resilience strategies to recover from the cascading ripple effect in a copper supply chain through project management"
   - Authors: V KEk, SP Nadeem, M Ravichandran, M Ethirajan, J Kandasamy
   - Venue: Operations Management Research 15 (1), 440-460
   - Year: 2022
   - Citations: 38
   - URL: https://link.springer.com/article/10.1007/s12063-021-00231-x

2. "Environment and economic analysis of reverse supply chain scenarios for remanufacturing using discrete-event simulation approach"
   - Authors: M Ravichandran, KEK Vimal, V Kumar, O Kulkarni, S Govindaswamy, ...
   - Venue: Environment, Development and Sustainability 26 (4), 10183-10224
   - Year: 2024
   - Citations: 16
   - URL: (from Google Scholar citation link)

3. "Supply chain routing in a diary industry using heterogeneous fleet system: simulation-based approach"
   - Authors: M Ravichandran, R Naresh, J Kandasamy
   - Venue: Journal of The Institution of Engineers (India): Series C 101 (5), 891-911
   - Year: 2020
   - Citations: 14
   - URL: https://link.springer.com/article/10.1007/s40032-020-00588-1

4. "Application of multi grade fuzzy approach to compute the circularity index of manufacturing organizations"
   - Authors: KEK Vimal, AK Kulatunga, M Ravichandran, J Kandasamy
   - Venue: Procedia CIRP 98, 476-481
   - Year: 2021
   - Citations: 13
   - URL: (from Google Scholar)

5. "Application of dmaic to reduce the rejection rate of starter motor shaft assembly in the automobile industry: a case study"
   - Authors: G Sundaramali, RK Santhosh, S Anirudh, R Mahadharsan, SK Selvaraj
   - Venue: International Journal of Industrial Engineering and Production Research 32, 1-18
   - Year: 2021
   - Citations: 8
   - URL: (from Google Scholar)

6. "A QFD Approach for Selection of Design for Logistics Strategies"
   - Authors: M Ravichandran, KEK Vimal, K Jayakrishna, AK Kulatunga
   - Venue: Design for Tomorrow—Volume 2: Proceedings of ICoRD 2021, 141-149
   - Year: 2021
   - Citations: 3
   - URL: https://link.springer.com/chapter/10.1007/978-981-16-0119-4_12

## Result

- All 6 publications added to publicationsData
- GitHub Actions workflow runs weekly to update citations
- Script scrapes Google Scholar and updates citation counts
- Changes automatically trigger Netlify rebuild
- Manual trigger option available via GitHub Actions UI
- Error handling ensures site doesn't break if scraping fails

## Notes

- Scraping Google Scholar may break if they change page structure
- Consider rate limiting to avoid being blocked
- May need to add delays between requests
- Can add email notifications if scraping fails repeatedly
- Manual fallback: User can always update data.js directly if needed
