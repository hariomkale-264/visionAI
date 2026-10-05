export type VoiceIntent =
  | { type: 'OPEN_NAVIGATION' }
  | { type: 'GO_TO_OBJECT_DETECTION' }
  | { type: 'START_CAMERA' }
  | { type: 'STOP_CAMERA' }
  | { type: 'READ_TEXT' }
  | { type: 'DESCRIBE' }
  | { type: 'EMERGENCY' }
  | { type: 'NAVIGATE_TO'; destination: string }
  | { type: 'CONFIRM_NAVIGATION' }
  | { type: 'CANCEL_NAVIGATION' }
  | { type: 'STOP_SPEECH' }
  | { type: 'REPEAT_LAST' }
  | { type: 'GO_BACK' }
  | { type: 'HELP' }
  | { type: 'START_ASSIST' }
  | { type: 'STOP_ASSIST' }
  | { type: 'SWITCH_CAMERA'; target?: 'user' | 'environment' }
  | { type: 'CHANGE_LANGUAGE'; languageCode: string; languageName: string }
  | { type: 'UNKNOWN'; raw: string };

export class CommandRouter {
  public static parse(transcript: string): VoiceIntent {
    const raw = transcript.trim();
    const lower = raw.toLowerCase();

    // 1. Emergency
    if (
      lower.includes('emergency') ||
      lower.includes('help me') ||
      lower.includes('i need help') ||
      lower.includes('मदद') ||
      lower.includes('आपत्कालीन')
    ) {
      return { type: 'EMERGENCY' };
    }

    // 2. Stop speech
    if (
      lower === 'stop' ||
      lower.startsWith('stop speaking') ||
      lower.startsWith('be quiet') ||
      lower.startsWith('silence') ||
      lower.includes('चुप') ||
      lower.includes('थांबा') ||
      lower.includes('रुक')
    ) {
      return { type: 'STOP_SPEECH' };
    }

    // 3. Repeat
    if (
      lower.includes('repeat') ||
      lower.includes('say again') ||
      lower.includes('फिर से बोलो') ||
      lower.includes('पुन्हा सांगा')
    ) {
      return { type: 'REPEAT_LAST' };
    }

    // 4. Go Back
    if (
      lower.includes('go back') ||
      lower.includes('previous') ||
      lower === 'back' ||
      lower.includes('वापस') ||
      lower.includes('मागे जा')
    ) {
      return { type: 'GO_BACK' };
    }

    // 5. Help
    if (
      lower === 'help' ||
      lower.includes('voice commands') ||
      lower.includes('what can i say') ||
      lower.includes('सहायता')
    ) {
      return { type: 'HELP' };
    }

    // 6. Camera controls
    if (lower.includes('start camera') || lower.includes('open camera') || lower.includes('turn on camera')) {
      return { type: 'START_CAMERA' };
    }
    if (lower.includes('stop camera') || lower.includes('close camera') || lower.includes('turn off camera')) {
      return { type: 'STOP_CAMERA' };
    }
    if (
      lower.includes('laptop camera') ||
      lower.includes('webcam') ||
      lower.includes('front camera')
    ) {
      return { type: 'SWITCH_CAMERA', target: 'user' };
    }
    if (lower.includes('rear camera') || lower.includes('back camera')) {
      return { type: 'SWITCH_CAMERA', target: 'environment' };
    }
    if (
      lower.includes('switch camera') ||
      lower.includes('toggle camera') ||
      lower.includes('change camera')
    ) {
      return { type: 'SWITCH_CAMERA' };
    }

    // 7. Start / Stop Assistance
    if (lower.includes('start assistance') || lower.includes('start assistant')) {
      return { type: 'START_ASSIST' };
    }
    if (lower.includes('stop assistance') || lower.includes('stop assistant')) {
      return { type: 'STOP_ASSIST' };
    }

    // 8. Confirm / Cancel Navigation
    if (
      lower === 'yes' ||
      lower === 'yeah' ||
      lower === 'start' ||
      lower.includes('start navigation') ||
      lower.includes('start walking') ||
      lower.includes('हाँ') ||
      lower.includes('हो')
    ) {
      return { type: 'CONFIRM_NAVIGATION' };
    }
    if (
      lower === 'no' ||
      lower.includes('cancel navigation') ||
      lower.includes('नहीं') ||
      lower.includes('नाही')
    ) {
      return { type: 'CANCEL_NAVIGATION' };
    }

    // 9. Object Detection Section navigation
    if (
      lower.includes('go to object detection') ||
      lower.includes('open object detection') ||
      lower.includes('object detection') ||
      lower.includes('detect objects') ||
      lower.includes('live detection')
    ) {
      return { type: 'GO_TO_OBJECT_DETECTION' };
    }

    // 10. Read Text (OCR)
    if (
      lower.includes('read text') ||
      lower.includes('read this') ||
      lower.includes('open text reader') ||
      lower.includes('read what') ||
      lower.includes('read the sign') ||
      lower.includes('read the board') ||
      lower.includes('what does this say') ||
      lower.includes('टेक्स्ट पढ़ो') ||
      lower.includes('मजकूर वाचा')
    ) {
      return { type: 'READ_TEXT' };
    }

    // 11. Describe
    if (
      lower.includes('describe') ||
      lower.includes('what is in front of me') ||
      lower.includes('what is ahead') ||
      lower.includes("what's ahead") ||
      lower.includes('describe my surroundings') ||
      lower.includes('वर्णन करो') ||
      lower.includes('वर्णन करा')
    ) {
      return { type: 'DESCRIBE' };
    }

    // 12. Destination Navigation
    const navPatterns = [
      /(?:i want to go to|take me to|navigate to|go to|directions to|route to)\s+(.+)/i,
      /(?:find|where is|search for)\s+(the nearest\s+.+|.+)/i,
      /(?:मुझे\s+(.+)\s+जाना है)/i,
      /(?:मला\s+(.+)\s+जायचे आहे)/i,
    ];

    for (const pattern of navPatterns) {
      const match = raw.match(pattern);
      if (match && match[1] && match[1].trim().length > 1) {
        const dest = match[1].trim().replace(/[.?]$/, '');
        // Exclude internal commands
        if (!dest.toLowerCase().includes('object detection') && !dest.toLowerCase().includes('navigation')) {
          return { type: 'NAVIGATE_TO', destination: dest };
        }
      }
    }

    // 13. Open Navigation Card
    if (
      lower.includes('open navigation') ||
      lower.includes('go to navigation') ||
      lower === 'navigation' ||
      lower.includes('नेविगेशन')
    ) {
      return { type: 'OPEN_NAVIGATION' };
    }

    // 14. Multilingual Switching
    if (lower.includes('hindi') || lower.includes('हिंदी')) {
      return { type: 'CHANGE_LANGUAGE', languageCode: 'hi-IN', languageName: 'Hindi' };
    }
    if (lower.includes('marathi') || lower.includes('मराठी')) {
      return { type: 'CHANGE_LANGUAGE', languageCode: 'mr-IN', languageName: 'Marathi' };
    }
    if (lower.includes('gujarati') || lower.includes('गुजराती')) {
      return { type: 'CHANGE_LANGUAGE', languageCode: 'gu-IN', languageName: 'Gujarati' };
    }
    if (lower.includes('bengali') || lower.includes('बंगाली')) {
      return { type: 'CHANGE_LANGUAGE', languageCode: 'bn-IN', languageName: 'Bengali' };
    }
    if (lower.includes('tamil') || lower.includes('तमिल')) {
      return { type: 'CHANGE_LANGUAGE', languageCode: 'ta-IN', languageName: 'Tamil' };
    }
    if (lower.includes('telugu') || lower.includes('तेलुगु')) {
      return { type: 'CHANGE_LANGUAGE', languageCode: 'te-IN', languageName: 'Telugu' };
    }
    if (lower.includes('kannada') || lower.includes('कन्नड़')) {
      return { type: 'CHANGE_LANGUAGE', languageCode: 'kn-IN', languageName: 'Kannada' };
    }
    if (lower.includes('malayalam') || lower.includes('मलयालम')) {
      return { type: 'CHANGE_LANGUAGE', languageCode: 'ml-IN', languageName: 'Malayalam' };
    }
    if (lower.includes('punjabi') || lower.includes('पंजाबी')) {
      return { type: 'CHANGE_LANGUAGE', languageCode: 'pa-IN', languageName: 'Punjabi' };
    }
    if (lower.includes('urdu') || lower.includes('उर्दू')) {
      return { type: 'CHANGE_LANGUAGE', languageCode: 'ur-IN', languageName: 'Urdu' };
    }
    if (lower.includes('english') || lower.includes('अंग्रेजी')) {
      return { type: 'CHANGE_LANGUAGE', languageCode: 'en-IN', languageName: 'Indian English' };
    }

    return { type: 'UNKNOWN', raw };
  }
}
