const fs = require('fs');

let code = fs.readFileSync('apps/frontend/orbis-ai/components/chat/nav/chat-sidebar.tsx', 'utf8');

// I need to just fix the syntax error right around line 241/280
code = code.replace(
  /<Calendar className="h-3 w-3" \/> \{createdAt\}\n\s+<\/div>\n\s+<\/div>\n\s+<div className="flex">/g,
  `<Calendar className="h-3 w-3" /> {createdAt}
                      </div>
                    </div>
                  </Link>
                  <div className="flex">`
);

code = code.replace(
  `} \/>\n\s+<\/button>\n\s+<\/DropdownMenuTrigger>\n\s*<\/TooltipTrigger>\n\s*<TooltipContent>\n\s*<p>Trip actions<\/p>\n\s*<\/TooltipContent>\n\s*<\/Tooltip>\n\s*<DropdownMenuContent align="end" className="w-44">/g,
  `} />
                            </button>
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Trip actions</p>
                        </TooltipContent>
                      </Tooltip>
                      <DropdownMenuContent align="end" className="w-44">`
);

code = code.replace(
  /Delete\n\s+<\/DropdownMenuItem>\n\s+<\/DropdownMenuContent>\n\s+<\/DropdownMenu>\n\s+\{deletingConversationId === conversation\.id && \(\n\s+<Loader2 className="mr-2 h-4 w-4 animate-spin text-muted-foreground" \/>\n\s+\)\}\n\s+<\/div>\n\s+\)\n\s+\}\)}\n/g,
  `Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {deletingConversationId === conversation.id && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  </div>
                </div>
              )
            })}\n`
);

fs.writeFileSync('apps/frontend/orbis-ai/components/chat/nav/chat-sidebar.tsx', code);
