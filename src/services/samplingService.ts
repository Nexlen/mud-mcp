import { EventEmitter } from 'events';
import type { 
  CreateMessageRequest, 
  CreateMessageResult, 
  SamplingHandler, 
  SamplingMessage,
  ModelPreferences 
} from '../types/mcp.js';
import { logToFile } from '../config/system.js';

export class SamplingService extends EventEmitter {
  private samplingHandler?: SamplingHandler;

  constructor() {
    super();
  }

  /**
   * Set the handler that will process sampling requests
   * This should be called by the transport layer when sampling capability is available
   */
  setSamplingHandler(handler: SamplingHandler): void {
    this.samplingHandler = handler;
    logToFile('[Sampling] Handler registered', 'mcp-server.log');
  }

  /**
   * Check if sampling is available
   */
  isAvailable(): boolean {
    return !!this.samplingHandler;
  }

  /**
   * Request AI assistance for content generation
   */
  async generateContent(
    prompt: string, 
    options: {
      systemPrompt?: string;
      maxTokens?: number;
      temperature?: number;
      context?: 'thisServer' | 'allServers' | 'none';
      modelPreferences?: ModelPreferences;
    } = {}
  ): Promise<string> {
    if (!this.samplingHandler) {
      throw new Error('Sampling is not available. Client must support sampling capability.');
    }

    const request: CreateMessageRequest = {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: prompt
          }
        }
      ],
      maxTokens: options.maxTokens || 200,
      systemPrompt: options.systemPrompt,
      temperature: options.temperature,
      includeContext: options.context || 'thisServer',
      modelPreferences: options.modelPreferences
    };

    logToFile(`[Sampling] Requesting content generation: ${prompt.substring(0, 100)}...`, 'mcp-server.log');

    try {
      const result = await this.samplingHandler(request);
      
      if (result.content.type === 'text' && result.content.text) {
        logToFile(`[Sampling] Generated content with model: ${result.model}`, 'mcp-server.log');
        return result.content.text;
      } else {
        throw new Error('Expected text content from sampling result');
      }
    } catch (error) {
      logToFile(`[Sampling] Error: ${error}`, 'mcp-server.log');
      throw error;
    }
  }

  /**
   * Generate NPC dialogue based on context
   */
  async generateNPCDialogue(
    npcName: string,
    playerMessage: string,
    gameContext: string
  ): Promise<string> {
    const systemPrompt = `You are ${npcName}, a character in a text-based adventure game. 
Respond to the player in character, staying true to your role and the game world. 
Keep responses concise and immersive.

Game Context: ${gameContext}`;

    return this.generateContent(
      `Player says: "${playerMessage}"`,
      {
        systemPrompt,
        maxTokens: 150,
        temperature: 0.8,
        modelPreferences: {
          intelligencePriority: 0.7,
          speedPriority: 0.6,
          costPriority: 0.4
        }
      }
    );
  }

  /**
   * Generate dynamic room descriptions
   */
  async generateRoomDescription(
    baseDescription: string,
    playerActions: string[],
    gameState: Record<string, unknown>
  ): Promise<string> {
    const systemPrompt = `You are a dungeon master describing a scene in a text-based adventure game.
Enhance the base description with dynamic details based on the player's recent actions and current game state.
Keep the description atmospheric and immersive.`;

    const prompt = `Base room: ${baseDescription}
Recent player actions: ${playerActions.join(', ')}
Current state: ${JSON.stringify(gameState, null, 2)}

Provide an enhanced, atmospheric description:`;

    return this.generateContent(prompt, {
      systemPrompt,
      maxTokens: 200,
      temperature: 0.7,
      modelPreferences: {
        intelligencePriority: 0.8,
        speedPriority: 0.5,
        costPriority: 0.3
      }
    });
  }

  /**
   * Generate quest hints or story progression
   */
  async generateQuestHint(
    questName: string,
    playerProgress: Record<string, unknown>,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium'
  ): Promise<string> {
    const systemPrompt = `You are a wise oracle providing cryptic but helpful hints to adventurers.
Your hints should guide players toward their quest goals without giving away the solution directly.
Adjust the clarity of your hints based on the difficulty level.`;

    const clarityMap = {
      easy: 'Give clear, direct hints',
      medium: 'Provide moderate hints with some mystery',
      hard: 'Give cryptic, challenging hints'
    };

    const prompt = `Quest: ${questName}
Player progress: ${JSON.stringify(playerProgress, null, 2)}
Hint style: ${clarityMap[difficulty]}

Provide a helpful hint:`;

    return this.generateContent(prompt, {
      systemPrompt,
      maxTokens: 100,
      temperature: 0.6,
      modelPreferences: {
        intelligencePriority: 0.9,
        speedPriority: 0.4,
        costPriority: 0.2
      }
    });
  }

  /**
   * Generate flavour text for items or actions
   */
  async generateFlavorText(
    item: string,
    action: string,
    context: string
  ): Promise<string> {
    const systemPrompt = `You are a narrator for a text-based adventure game.
Provide brief, evocative flavor text that makes actions and items feel more immersive.
Keep responses short and atmospheric.`;

    const prompt = `Item/Action: ${item}
Player action: ${action}
Context: ${context}

Provide atmospheric flavor text:`;

    return this.generateContent(prompt, {
      systemPrompt,
      maxTokens: 80,
      temperature: 0.7,
      modelPreferences: {
        intelligencePriority: 0.6,
        speedPriority: 0.7,
        costPriority: 0.5
      }
    });
  }
}

// Export singleton instance
const samplingService = new SamplingService();
export default samplingService;
