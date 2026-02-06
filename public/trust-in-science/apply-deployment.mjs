#!/usr/bin/env node

/**
 * Reads deployment.json and applies the values to config.json.
 *
 * Usage:
 *   node apply-deployment.mjs
 *   node apply-deployment.mjs --check   (dry-run: shows what would change)
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const deploymentPath = join(__dirname, 'deployment.json');
const configPath = join(__dirname, 'config.json');

const dryRun = process.argv.includes('--check');

const deployment = JSON.parse(readFileSync(deploymentPath, 'utf-8'));
const config = JSON.parse(readFileSync(configPath, 'utf-8'));

const changes = [];

// Study version
if (deployment.STUDY_VERSION && config.studyMetadata.version !== deployment.STUDY_VERSION) {
  changes.push(`studyMetadata.version: "${config.studyMetadata.version}" → "${deployment.STUDY_VERSION}"`);
  config.studyMetadata.version = deployment.STUDY_VERSION;
}

// Contact email
if (deployment.CONTACT_EMAIL && config.uiConfig.contactEmail !== deployment.CONTACT_EMAIL) {
  changes.push(`uiConfig.contactEmail: "${config.uiConfig.contactEmail}" → "${deployment.CONTACT_EMAIL}"`);
  config.uiConfig.contactEmail = deployment.CONTACT_EMAIL;
}

// URL participant ID param
if (deployment.PLATFORM_PARAM && config.uiConfig.urlParticipantIdParam !== deployment.PLATFORM_PARAM) {
  changes.push(`uiConfig.urlParticipantIdParam: "${config.uiConfig.urlParticipantIdParam}" → "${deployment.PLATFORM_PARAM}"`);
  config.uiConfig.urlParticipantIdParam = deployment.PLATFORM_PARAM;
}

// Study end message with completion code and redirect
if (deployment.COMPLETION_CODE && deployment.PLATFORM_REDIRECT_BASE) {
  const newMsg = `**Thank you for completing the study.** You may click this link to return to Prolific: [Complete Study](${deployment.PLATFORM_REDIRECT_BASE}?cc=${deployment.COMPLETION_CODE}&${deployment.PLATFORM_PARAM}={PARTICIPANT_ID})`;
  if (config.uiConfig.studyEndMsg !== newMsg) {
    changes.push(`uiConfig.studyEndMsg: updated with completion code "${deployment.COMPLETION_CODE}"`);
    config.uiConfig.studyEndMsg = newMsg;
  }
}

// paramCapture in introduction response
if (deployment.PLATFORM_PARAM && config.components.introduction?.response) {
  const prolificResponse = config.components.introduction.response.find(r => r.id === 'prolificId');
  if (prolificResponse && prolificResponse.paramCapture !== deployment.PLATFORM_PARAM) {
    changes.push(`components.introduction.prolificId.paramCapture: "${prolificResponse.paramCapture}" → "${deployment.PLATFORM_PARAM}"`);
    prolificResponse.paramCapture = deployment.PLATFORM_PARAM;
  }
}

if (changes.length === 0) {
  console.log('No changes needed — config.json is up to date with deployment.json');
} else if (dryRun) {
  console.log('Dry run — the following changes would be applied:\n');
  changes.forEach(c => console.log(`  • ${c}`));
} else {
  writeFileSync(configPath, JSON.stringify(config, null, 4) + '\n');
  console.log('Applied the following changes to config.json:\n');
  changes.forEach(c => console.log(`  • ${c}`));
}
