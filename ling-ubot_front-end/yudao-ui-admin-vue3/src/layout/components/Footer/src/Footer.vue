<script lang="ts" setup>
import { useAppStore } from '@/store/modules/app'
import { useDesign } from '@/hooks/web/useDesign'

// eslint-disable-next-line vue/no-reserved-component-names
defineOptions({ name: 'Footer' })

const { getPrefixCls } = useDesign()

const prefixCls = getPrefixCls('footer')

const appStore = useAppStore()

const title = computed(() => appStore.getTitle)

const footerText = import.meta.env.VITE_APP_FOOTERTEXT
const mapFooter = import.meta.env.VITE_APP_MAPFOOTER
defineProps({
  name: {
    type: String,
    default: '',
    required: true
  }
})
</script>

<template>
  <div :class="prefixCls"
    class="h-[var(--app-footer-height)] bg-[var(--app-content-bg-color)] text-center leading-[var(--app-footer-height)] text-[var(--el-text-color-placeholder)] dark:bg-[var(--el-bg-color)] overflow-hidden">
    <span v-if="name !== '/map/location/index'" class="text-14px">Copyright ©2025 {{ footerText }}</span>
    <span v-else class="text-14px">Copyright ©2025 {{ mapFooter }}</span>
  </div>
</template>
