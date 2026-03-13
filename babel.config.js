module.exports = function (api) {
  api.cache(true);
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'react-native-reanimated/plugin',
        {
          relativeSourceLocation: true,
        },
      ],
      // Production'da tüm console.log/warn/error'ları kaldır
      ...(isProduction ? [['transform-remove-console', { exclude: [] }]] : []),
    ],
  };
};
