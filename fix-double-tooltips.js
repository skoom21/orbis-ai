const fs = require('fs');

let code = fs.readFileSync('apps/frontend/orbis-ai/components/chat/messages/message.tsx', 'utf8');

// Replace the double wrapping
code = code.replace(/<Tooltip delayDuration=\{300\}>\s*<TooltipTrigger asChild>\s*<Tooltip delayDuration=\{300\}>\s*<TooltipTrigger asChild>/g, "<Tooltip delayDuration={300}>\n              <TooltipTrigger asChild>");
code = code.replace(/<\/TooltipTrigger>\s*<TooltipContent>[\s\S]*?<\/Tooltip>\s*<\/TooltipTrigger>\s*<TooltipContent>[\s\S]*?<\/Tooltip>/g, (fullMatch) => {
  // We just want one closing block
  const singleClose = `</TooltipTrigger>\n              <TooltipContent>\n                <p>TempText</p>\n              </TooltipContent>\n            </Tooltip>`;
  return singleClose; // Wait we lose the correct text. Let's just fix it properly.
})

fs.writeFileSync('apps/frontend/orbis-ai/components/chat/messages/message.tsx.fixed', code);
