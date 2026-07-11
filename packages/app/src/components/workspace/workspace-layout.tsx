import { createMemo, createSignal, ParentProps, Show } from "solid-js"
import { createMediaQuery } from "@solid-primitives/media"
import { ResizeHandle } from "@opencode-ai/ui/resize-handle"
import { Icon } from "@opencode-ai/ui/v2/icon"
import { IconButtonV2 } from "@opencode-ai/ui/v2/icon-button-v2"
import { TooltipV2 } from "@opencode-ai/ui/v2/tooltip-v2"
import { useSettings } from "@/context/settings"
import { RepoExplorer } from "./repo-explorer"
import { AIWorkspace } from "./ai-workspace"

const DEFAULT_LEFT_WIDTH = 260
const DEFAULT_RIGHT_WIDTH = 280
const LEFT_MIN = 200
const LEFT_MAX = 420
const RIGHT_MIN = 220
const RIGHT_MAX = 400
const COLLAPSE_THRESHOLD = 50

export function WorkspaceLayout(props: ParentProps) {
  const settings = useSettings()
  const isDesktop = createMediaQuery("(min-width: 1024px)")
  const isTablet = createMediaQuery("(min-width: 768px) and (max-width: 1023px)")

  const [leftWidth, setLeftWidth] = createSignal(DEFAULT_LEFT_WIDTH)
  const [rightWidth, setRightWidth] = createSignal(DEFAULT_RIGHT_WIDTH)
  const [mobileLeft, setMobileLeft] = createSignal(false)
  const [mobileRight, setMobileRight] = createSignal(false)

  const leftOpen = createMemo(() => {
    if (!isDesktop() && !isTablet()) return mobileLeft()
    return isDesktop() && settings.visibility.leftSidebar()
  })
  const rightOpen = createMemo(() => {
    if (!isDesktop() && !isTablet()) return mobileRight()
    if (isTablet()) return false
    return isDesktop() && settings.visibility.rightSidebar()
  })

  const toggleLeft = () => {
    if (isDesktop()) {
      settings.setShowLeftSidebar(!settings.visibility.leftSidebar())
    } else {
      setMobileLeft(!mobileLeft())
    }
  }
  const toggleRight = () => {
    if (isDesktop()) {
      settings.setShowRightSidebar(!settings.visibility.rightSidebar())
    } else {
      setMobileRight(!mobileRight())
    }
  }

  return (
    <div class="flex-1 min-h-0 flex flex-row relative">
      {/* Mobile overlay */}
      <Show when={(mobileLeft() || mobileRight()) && !isDesktop()}>
        <div
          class="absolute inset-0 z-20 bg-black/30"
          onClick={() => { setMobileLeft(false); setMobileRight(false) }}
        />
      </Show>

      {/* Left Toggle Button (when collapsed) */}
      <Show when={!leftOpen() && (isDesktop() || isTablet())}>
        <div class="absolute left-0 top-0 bottom-0 z-10 flex items-center">
          <TooltipV2 placement="right" value="Explorer">
            <IconButtonV2
              type="button"
              variant="ghost-muted"
              size="small"
              class="size-6 rounded-r-none rounded-l hover:bg-v2-surface-hover border border-border-weaker-base border-l-0 bg-v2-background-bg-base"
              icon={<Icon name="filetree" size="sm" />}
              onClick={toggleLeft}
              aria-label="Open Explorer"
            />
          </TooltipV2>
        </div>
      </Show>

      {/* Left Sidebar */}
      <Show when={leftOpen()}>
        <div
          class="h-full shrink-0 flex flex-col overflow-hidden border-r border-border-weaker-base z-30 transition-all duration-200"
          classList={{
            "absolute left-0 top-0 bottom-0 shadow-xl": !isDesktop(),
            "w-64": !isDesktop(),
          }}
          style={{ width: isDesktop() ? `${leftWidth()}px` : undefined }}
        >
          <Show when={!isDesktop()}>
            <div class="shrink-0 flex items-center justify-end px-2 py-1 border-b border-border-weaker-base">
              <IconButtonV2
                type="button"
                variant="ghost-muted"
                size="small"
                class="size-6"
                icon={<Icon name="close" size="sm" />}
                onClick={toggleLeft}
                aria-label="Close Explorer"
              />
            </div>
          </Show>
          <RepoExplorer />
        </div>
        <Show when={isDesktop()}>
          <ResizeHandle
            direction="horizontal"
            edge="end"
            size={leftWidth()}
            min={LEFT_MIN}
            max={LEFT_MAX}
            collapseThreshold={COLLAPSE_THRESHOLD}
            onResize={(width) => setLeftWidth(width)}
            onCollapse={() => settings.setShowLeftSidebar(false)}
          />
        </Show>
      </Show>

      {/* Center: Main Content */}
      <div class="flex-1 min-h-0 min-w-0 flex flex-col">
        {props.children}
      </div>

      {/* Right Sidebar */}
      <Show when={rightOpen()}>
        <Show when={isDesktop()}>
          <ResizeHandle
            direction="horizontal"
            edge="start"
            size={rightWidth()}
            min={RIGHT_MIN}
            max={RIGHT_MAX}
            collapseThreshold={COLLAPSE_THRESHOLD}
            onResize={(width) => setRightWidth(width)}
            onCollapse={() => settings.setShowRightSidebar(false)}
          />
        </Show>
        <div
          class="h-full shrink-0 flex flex-col overflow-hidden border-l border-border-weaker-base z-30 transition-all duration-200"
          classList={{
            "absolute right-0 top-0 bottom-0 shadow-xl": !isDesktop(),
            "w-72": !isDesktop(),
          }}
          style={{ width: isDesktop() ? `${rightWidth()}px` : undefined }}
        >
          <Show when={!isDesktop()}>
            <div class="shrink-0 flex items-center justify-end px-2 py-1 border-b border-border-weaker-base">
              <IconButtonV2
                type="button"
                variant="ghost-muted"
                size="small"
                class="size-6"
                icon={<Icon name="close" size="sm" />}
                onClick={toggleRight}
                aria-label="Close AI Workspace"
              />
            </div>
          </Show>
          <AIWorkspace />
        </div>
      </Show>

      {/* Right Toggle Button (when collapsed) */}
      <Show when={!rightOpen() && isDesktop()}>
        <div class="absolute right-0 top-0 bottom-0 z-10 flex items-center">
          <TooltipV2 placement="left" value="AI Workspace">
            <IconButtonV2
              type="button"
              variant="ghost-muted"
              size="small"
              class="size-6 rounded-l-none rounded-r hover:bg-v2-surface-hover border border-border-weaker-base border-r-0 bg-v2-background-bg-base"
              icon={<Icon name="sidebar-right" size="sm" />}
              onClick={toggleRight}
              aria-label="Open AI Workspace"
            />
          </TooltipV2>
        </div>
      </Show>

      {/* Mobile toggle buttons */}
      <Show when={!isDesktop() && !isTablet()}>
        <div class="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
          <TooltipV2 placement="left" value="Explorer">
            <IconButtonV2
              type="button"
              variant="secondary"
              size="small"
              class="size-8 shadow-md"
              icon={<Icon name="filetree" size="sm" />}
              onClick={toggleLeft}
              aria-label="Toggle Explorer"
            />
          </TooltipV2>
          <TooltipV2 placement="left" value="AI Workspace">
            <IconButtonV2
              type="button"
              variant="secondary"
              size="small"
              class="size-8 shadow-md"
              icon={<Icon name="sidebar-right" size="sm" />}
              onClick={toggleRight}
              aria-label="Toggle AI Workspace"
            />
          </TooltipV2>
        </div>
      </Show>
    </div>
  )
}
