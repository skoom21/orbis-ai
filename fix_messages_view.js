import fs from 'fs';
const path = 'apps/frontend/orbis-ai/components/chat/messages/messages-view.tsx';
let data = fs.readFileSync(path, 'utf8');

const regex = /{visibleMessages\.map\(\(msg\) => {([\s\S]*?)return \(\s*<Message([\s\S]*?)\/>\s*\)\s*}\)}/;

data = data.replace(regex, `{visibleMessages.map((msg, index) => {
            const siblingMeta = getSiblingMeta(msg.id)
            const msgDate = new Date(msg.created_at || Date.now());
            const isToday = msgDate.toDateString() === new Date().toDateString();
            const dateLabel = isToday ? 'Today' : msgDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            
            let showDateHeader = false;
            if (index === 0) {
              showDateHeader = true;
            } else {
              const prevMsgDate = new Date(visibleMessages[index - 1].created_at || Date.now());
              if (msgDate.toDateString() !== prevMsgDate.toDateString()) {
                showDateHeader = true;
              }
            }

            return (
              <React.Fragment key={msg.id}>
                {showDateHeader && (
                  <div className="sticky top-2 z-10 mx-auto flex w-fit items-center justify-center rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-md border border-border/50 shadow-sm">
                    {dateLabel}
                  </div>
                )}
                <Message 
$2/>
              </React.Fragment>
            )
          })}`);

// Fix the ArrowDown button
const btnRegex = /<button\s+type="button"[\s\S]*?onClick=\{\(\) => \{[\s\S]*?className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-lg hover:bg-muted transition-colors"\s+aria-label="Scroll to latest"\s*>\s*<ArrowDown className="h-4 w-4 text-foreground" \/>\s*<\/button>/;

data = data.replace(btnRegex, `<button
          type="button"
          onClick={() => {
            setAutoScrollEnabled(true)
            setSetting('autoScroll', true)
            if (scrollRef.current) {
              scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
            }
          }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 rounded-full border border-border bg-background/90 px-4 py-2 text-sm font-medium text-foreground shadow-lg backdrop-blur-xl hover:bg-muted/80 transition-all z-20"
          aria-label="Scroll to latest"
        >
          <ArrowDown className="h-4 w-4" />
          <span>New messages ↓</span>
        </button>`);
fs.writeFileSync(path, data);
