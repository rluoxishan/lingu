import AMapLoader from '@amap/amap-jsapi-loader';

export const loadAMap = () => {
  return AMapLoader.load({
    key: import.meta.env.VITE_AMAP_API_KEY,
    version: '2.0',
    plugins: ['AMap.MarkerCluster'],
  })
}
