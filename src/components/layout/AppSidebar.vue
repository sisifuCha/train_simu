<template>
  <nav class="app-sidebar">
    <div
      v-for="item in navItems"
      :key="item.id"
      class="nav-item"
      :class="{ active: activePanel === item.id }"
      @click="$emit('change', item.id)"
    >
      <span class="nav-icon">{{ item.icon }}</span>
      <span class="nav-label">{{ item.label }}</span>
    </div>
  </nav>
</template>

<script setup>
defineProps({ activePanel: String })
defineEmits(['change'])

const navItems = [
  { id: 'route',   icon: '⇒', label: '进路办理' },
  { id: 'turnout', icon: '⊞', label: '道岔控制' },
  { id: 'signal',  icon: '●', label: '信号机' },
  { id: 'train',   icon: '▶', label: '列车管理' },
  { id: 'log',     icon: '≡', label: '操作日志' }
]
</script>

<style scoped>
.app-sidebar {
  width: 80px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 8px 0;
  flex-shrink: 0;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 12px 4px;
  cursor: pointer;
  border-left: 2px solid transparent;
  transition: all 0.15s;
  user-select: none;
}
.nav-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.nav-item.active {
  border-left-color: var(--accent-green);
  background: var(--bg-hover);
  color: var(--accent-green);
}
.nav-icon {
  font-size: 18px;
  line-height: 1;
}
.nav-item.active .nav-icon {
  filter: drop-shadow(0 0 4px var(--accent-green));
}
.nav-label {
  font-size: 10px;
  text-align: center;
  color: var(--text-secondary);
}
.nav-item.active .nav-label {
  color: var(--accent-green);
}
</style>
