<template>
  <div id="map-container" style="width: 100%; height: 500px;"></div>
</template>

<script lang="ts">
import { defineComponent, onMounted, reactive, ref } from 'vue'
import { loadAMap } from '@/utils/amap-loader'

const {t} = useI18n()
const message = useMessage()

export default defineComponent({
  name: 'VehicleMapViewer',
  props: {
    vehicleSummary: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const map = ref<AMap.Map | null>(null)
    const marker = ref<AMap.Marker | null>(null)
    const location = ref([114.401675, 22.701666]) // This variable uses Chinese notation only (first longitude, second latitude)

    const mapActions = reactive({
      setLocationMarker(latitude: number, longitude: number) {
        if (map.value && marker.value) {
          location.value = [longitude, latitude]
          marker.value.setPosition(location.value)
          map.value.setCenter(location.value)
        } else {
          message.error(t('map.error.markerInitialization'))
        }
      },
      focus() {
        if (map.value && marker.value) {
          marker.value.setPosition(location.value)
          map.value.setCenter(location.value)
          map.value.setZoom(16)
        }
      },
    });

    onMounted(async () => {
        const AMap = await loadAMap()
        map.value = new AMap.Map('map-container', {
          center: location.value,
          zoom: 16,
        })

        // Disable map interaction (dragging, zooming, rotation, etc.)
        map.value.setStatus({
          dragEnable: true,
          zoomEnable: true,
          rotateEnable: false,
          pitchEnable: false,
        })

        map.value.setZooms([16, 18])

        // Define the bounds (southwest and northeast corners)
        const bounds = new AMap.Bounds(
          [114.391252, 22.696138], // Southwest corner (longitude, latitude)
          [114.411126, 22.708098]  // Northeast corner (longitude, latitude)
        )

        marker.value = new AMap.Marker({
          position: location.value,
          icon: new AMap.Icon({
            image: '/src/assets/imgs/map-marker.png',
            imageSize: new AMap.Size(35, 35), // Size of the image (same as icon size in this case)
          }),
          offset: new AMap.Pixel(-17.5, -17.5), // Adjust offset for the icon
        })

        marker.value.setLabel({
          content: `
            <div class="custom-label">
              <span class="label-text">${props.vehicleSummary}</span>
            </div>
            `,
          offset: new AMap.Pixel(0, -5), // Adjust position relative to the marker
          direction: 'top', // Position the label above the marker
        })

        // Set drag limits to the defined bounds
        map.value.setLimitBounds(bounds)

        map.value.add(marker.value)
    })

    return { mapActions }

  },
})

</script>

<style scoped>
#map-container {
  border: 1px solid #ddd;
}
</style>
