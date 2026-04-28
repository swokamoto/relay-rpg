import { 
  createErrorResponse, 
  createSuccessResponse, 
  getUserId, 
  getChannelId 
} from '../utils/discord.js';
import { 
  validateAdventureDescription,
  validateParticipantCount 
} from '../utils/validation.js';
import { 
  formatMessage, 
  formatParticipantList, 
  getPlayerStatusMessage 
} from '../utils/gameHelpers.js';
import { Job } from '../models/Job.js';
import { MESSAGES, EMOJIS } from '../config/constants.js';
import { 
  InteractionResponseType, 
  InteractionResponseFlags, 
  MessageComponentTypes 
} from 'discord-interactions';

/**
 * Handle /post command - Create a new adventure job
 */
export async function handlePostCommand(req, res, gameStorage) {
  const userId = getUserId(req);
  const channelId = getChannelId(req);
  const description = req.body.data.options[0].value;

  // Validate description
  const validation = validateAdventureDescription(description);
  if (!validation.valid) {
    return res.send(createErrorResponse(`❌ ${validation.error}`, true));
  }

  // Create new job
  const job = new Job(validation.description, userId, channelId);
  gameStorage.addJob(job);

  // Create instant join button for the post
  const joinButton = {
    type: 1, // ACTION_ROW
    components: [
      {
        type: 2, // BUTTON
        style: 1, // Primary
        label: 'Join Adventure',
        custom_id: `join_job_${job.id}`,
        emoji: {
          name: '⚔️'
        }
      },
      {
        type: 2, // BUTTON  
        style: 2, // Secondary
        label: 'View All Jobs',
        custom_id: 'view_all_jobs',
        emoji: {
          name: '📋'
        }
      }
    ]
  };

  const content = `${EMOJIS.ADVENTURE} **Adventure Posted!**\n\n` +
                 `**Quest:** "${job.description}"\n` +
                 `**Posted by:** <@${userId}>\n\n` +
                 `${EMOJIS.LIGHTBULB} *Others can join instantly using the button below!*`;

  return res.send(createSuccessResponse(content, false, [joinButton]));
}

/**
 * Handle /jobs command - List available adventure jobs
 */
export async function handleJobsCommand(req, res, gameStorage) {
  const userId = getUserId(req);
  const availableJobs = gameStorage.getJobBoard();

  if (availableJobs.length === 0) {
    return res.send(createSuccessResponse(
      `${EMOJIS.WAITING} **No Adventures Available**\n\n` +
      `Be the first to post an adventure! Use \`/post "description"\` to create one.\n\n` +
      `${EMOJIS.LIGHTBULB} *Adventure descriptions should be engaging and 10-200 characters long.*`
    ));
  }

  // Filter available jobs (only show ones that can accept participants, limit to 5)
  const displayJobs = availableJobs
    .filter(job => job.canAcceptParticipants())
    .slice(0, 5); // Limit to 5 most recent

  if (displayJobs.length === 0) {
    return res.send(createSuccessResponse(
      `${EMOJIS.WAITING} **No Available Adventures**\n\n` +
      `All current adventures are in progress or completed.\n` +
      `Use \`/post "description"\` to create a new adventure!`
    ));
  }

  let content = `${EMOJIS.ADVENTURE} **Available Adventures** (${displayJobs.length})\n\n`;
  const components = [];

  displayJobs.forEach((job, index) => {
    content += `**${index + 1}.** ${job.getDisplayText()}\n\n`;
    
    // Create individual action row for each job's button
    components.push({
      type: 1, // ACTION_ROW
      components: [
        {
          type: 2, // BUTTON
          style: 1, // Primary
          label: `Join "${job.description.substring(0, 20)}${job.description.length > 20 ? '...' : ''}"`,
          custom_id: `join_job_${job.id}`,
          emoji: {
            name: '⚔️'
          }
        }
      ]
    });
  });

  return res.send(createSuccessResponse(content, false, components));
}