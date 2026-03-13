import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

/**
 * Google Sign-In Hook using Expo Auth Session
 * useAuthRequest yerine useIdTokenAuthRequest kullanıldı çünkü
 * useIdTokenAuthRequest access_token döndürmez → People API çalışmıyordu
 */
export const useGoogleSignIn = () => {
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: '771170272718-vn12200du7e2rpti11s321g5m9192abt.apps.googleusercontent.com',
    androidClientId: '771170272718-u6c9mo2vi0p2qhh648249qa0s51ld5ls.apps.googleusercontent.com',
    iosClientId: '771170272718-kclrkjqs2ts8c54pbl4sq2k85bupqem9.apps.googleusercontent.com',
    scopes: [
      'profile',
      'email',
      'openid',
      'https://www.googleapis.com/auth/user.birthday.read',
      'https://www.googleapis.com/auth/user.gender.read',
    ],
  });

  const signIn = async () => {
    try {
      const result = await promptAsync({ prompt: 'select_account' });

      if (result.type === 'success') {
        const { access_token, id_token } = result.params;
        let gender, birthday, idToken = id_token;

        // access_token ile People API'den cinsiyet ve doğum tarihi al
        if (access_token) {
          try {
            const userInfoResponse = await fetch(
              'https://people.googleapis.com/v1/people/me?personFields=genders,birthdays',
              {
                headers: {
                  Authorization: `Bearer ${access_token}`,
                },
              }
            );

            const userData = await userInfoResponse.json();
            console.log('📝 Google People API Data:', userData);

            gender = userData.genders?.[0]?.value; // 'male', 'female', etc.
            const birthdayData = userData.birthdays?.[0]?.date;

            if (birthdayData?.year && birthdayData?.month && birthdayData?.day) {
              const year = birthdayData.year;
              const month = String(birthdayData.month).padStart(2, '0');
              const day = String(birthdayData.day).padStart(2, '0');
              birthday = `${year}-${month}-${day}`;
            }

            console.log('📝 Extracted gender/birthday:', { gender, birthday });
          } catch (error) {
            console.error('Failed to fetch People API data:', error);
          }

          // id_token yoksa access_token ile userinfo endpoint'ten al
          if (!idToken) {
            try {
              const tokenInfoResponse = await fetch(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                {
                  headers: { Authorization: `Bearer ${access_token}` },
                }
              );
              const tokenInfo = await tokenInfoResponse.json();
              // Backend bu access_token'ı id_token olarak kullanamaz
              // ama sub, email, name bilgilerini alıyoruz
              console.log('📝 UserInfo:', tokenInfo);
            } catch (e) {
              console.error('UserInfo fetch error:', e);
            }
          }
        }

        return {
          idToken: idToken,
          accessToken: access_token,
          gender,
          birthday,
        };
      }

      return null;
    } catch (error) {
      console.error('Google Sign-In error:', error);
      throw error;
    }
  };

  return { signIn, request, response };
};
