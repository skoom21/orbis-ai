const fs = require('fs');

let code = fs.readFileSync('apps/frontend/orbis-ai/components/chat/messages/message.tsx', 'utf8');

if (!code.includes('TooltipTrigger')) {
  code = code.replace(
    "import { Button } from '@/components/ui/button';",
    "import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';\nimport { Button } from '@/components/ui/button';"
  );
}

function replaceButton(searchAriaString, tooltipText) {
  const regex = new RegExp(`(<Button[^>]+aria-label=${searchAriaString}[^>]*>)([\\s\\S]*?)(</Button>)`, 'g');
  code = code.replace(regex, (match, openTag, content, closeTag) => {
    const textContent = tooltipText.startsWith('{') ? tooltipText : `${tooltipText}`;
    return `<Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                ${openTag}${content}${closeTag}
              </TooltipTrigger>
              <TooltipContent>
                <p>${textContent}</p>
              </TooltipContent>
            </Tooltip>`;
  });
}

replaceButton('"Copy message"', 'Copy message');
replaceButton('"Edit message"', 'Edit message');
// Correct regex handling for the conditional aria label
replaceButton('{isSpeaking \\? \\\'Stop reading message\\\' : \\\'Read message aloud\\\'}', '{isSpeaking ? "Stop reading" : "Read aloud"}');
replaceButton('"Regenerate response"', 'Regenerate');
replaceButton('"Continue response"', 'Continue');
replaceButton('"Fork response"', 'Branch from here');
replaceButton('"Thumbs up"', 'Good response');
replaceButton('"Thumbs down"', 'Bad response');
replaceButton('"Share response"', 'Share');

replaceButton('"Previous sibling message"', 'Previous version');
replaceButton('"Next sibling message"', 'Next version');

fs.writeFileSync('apps/frontend/orbis-ai/components/chat/messages/message.tsx', code);
console.log("Updated message.tsx");
