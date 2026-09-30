using System;
using System.IO;
using System.Diagnostics;
using System.Windows.Forms;
using System.Drawing;

namespace DnaAiInstaller
{
    public class Program
    {
        private const string APP_NAME = "DNA AI Platform";
        private const string APP_URL = "https://dna-ai-tools-one.vercel.app";
        private const string ICON_BASE64 = "AAABAAEAwMAAAAEAIAALKQAAFgAAAIlQTkcNChoKAAAADUlIRFIAAADAAAAAwAgGAAAAUtxsBwAAKNJJREFUeJztnXmcZVV1739r733OHWueq2dmaAa1UYhBu8FZ4tNEq1XUDC8mahIcYwSjVFciCE/9ICEPFZMYlWdMF8EhiMYE6VZEBIuhoUuBpoea57nudM7e6/1xzrn3VnV1d3V1AS3s7+dTXXXPvefcc2+v3x7WXmttwGKxWCwWi8VisVgsFovFYrFYLBaLxWKxWCwWi8VisVgsFovFYrFYLBaLxWKxWCwWi8VisVgsFovFYnlBwgA91/dgsTwnWOO3vGCJjP/J006LPX7OOe5zfT+WwxHP9Q08X4mM/zdnnFFfPTH1Cbe7QLY3OPmwAngGYIB2AZIAbpyc7RRSTpyBfXkA8rm+N4vlGYcBBQDjzWv+caJ1gx5uaEiHx20PYHl+w2ErP97Y+E7ecBaPta7/LgDstK3/SYl6rm/g+QQDggA9Vlt7jnLSX9FERubz94Ut/wm1/mW9R/SbCeATumGLnQOsFpGRM6Aolv66cmIVWd8TxPxQaKgrMlYGJIfzifDHhD8cPQc7tFoxtgdYPQQBeqSx+ZraWPLCSTZaGOORKTwVPn9cAuCgcWICdPhYztfXN2bZrUzFkEkMDAwR4JW/ngCzeh/nhYFtOVaByPhydemzvFjjwwXHVQ6gCl7+4NDAgTPPBQoM0HKHLGGLrwFgrqHldazcd2ohLjIkWwxQIcBZyWaQjLlf6sLtqZHB7yPsEaLzLMvD9gCrAwHAjFt7c5Ubi+e1zjtSqrzx+1dq/H319WdUOckvKuW+QQoHOQKYGQQGg1Ik6LQk4zStY++eaXbuz+rsx2l09F4rguPDzgFOkMjgJuqbLq9w4q+eNcYHICUAEE0DQOcyv+foWmMNLa+tjVX9IhZPv2GWpJ5m7eeNNj4zGwYzsylobaaM9meIfBVPXZyKV90zXt/4XgI0W4/TsrECOHF4JyBZOh0sBANMIAIBYBJTANC2nIuEc4i5hoYLYm7yu9pxa6d9zydAAKQAEqEriRAcEwApAuS80TovlEwnKr861tDwNgK0dbsuDzsEOgHuARQB/mhjy5tT8eSWWcNagASDNTGgtD8LALuOPdeiHQAYcMdV8ptpx03Mau0LEiocNzFKrtTyoRQF/5A0xuisUCSd1D/P15n7kuPjg3ZifGxsD3ACbAuNi6XzYSMUC2ZmoGSuy3QyMCA7ADPZ0PyOajd+3qw2viBSXHKfUumlIVQUQ9DZEGSBjal045UFJ34VLTzPcgSsAFZI1LpONFaf7yjnlfNGM1Np2GHA0ELWAcC2Y0+AAyEp9088EiyIF59Qvo4QmX7RwDlYf2ABiFkGa+lcMVlVVR3OB6wIjoIVwMoRAMCyoq1COgLMGqVhCjEI7Ouq8LVHFEDoITLTFa11LNSLcsxkQJGQaImf6GoUmXbwBBEA4TFzUrp1voptKb9Py9LYL2flBK2rEG/IAwgnq0VD9xkQUjYtYxxOAJCPFdYrEtUazIviJnjR7+icw7qJUBPGIcGk3LPLr29ZGiuAFRAaNU82N69nyHNzDIRemmjkTx4AFrR+MJ2uC89Z0hA7w+OxvHRVcURTThRhAQp/hyMeoqUuyODACaVN7Wp81uc7VgArgwBAsjgvJWTMBMMfBDPgYFTjszEJoari8fg54TlLftdtocFzTPh+eHJ0odJ7FTuB0Oa59G6lA8GLGWDDLIyePLGP+MLACmBlEAD4Qm12hERxiFPm+WHAJKSCEe4rys9ZAgYAKU2vNt6MYlrUDXB07uIBD5V5iaIXMhOJnNGkyX+s/AKWpbECWAG7wt9GOWcwEbjYMpfBTAUigNRrwyNLhieEUZ2iYnh4hLTZE6NSABwOjyKNpr9YdDzqGdgloozxRwB0Rbd5fJ/uhYUVwArYFhqfMME4e4mmnUAkMswspXzZcGXlaZGhH+GSAgCM8f8lzkwMMJWbOop/Bz8c/KaFeQZkGKaCiKTW32gYH5+NwqhP+AM/j7ECWBnReldF0FQfJgEmAIZZVzjxmIynrwiPL/l9h/56cXB04LbJQuaXFVI5BuyViWCxERfX24oHmP24lGo6nxvMi8kbwkm3bf2PgRXAyghNU8YitwwWjskpDNoR8wRAOH/KaEniyAtTDAAXAp7ys+/xvOxoWkiHiQtcttqLks0vEAUze46QSvoF7ev8e9YMzo11hp6qZ+jzP2+wAlgBxehOrzAb+D6ZEbT6ixerRMEYv9qNr5+ox7tCg1wySI0AsxOQVWNjT2Xys6/Xhez+GqFcASIwfDBrMBswDDMMMxsw+wyYKikd5ednM4XMWxtGBu5mQG63IdHLwgpgBRSjO5WcIeZyN0y5RyaI0QFTRghm6fztMJAGYI60JrA9jOJsHBt7aIDHLs7k576idCFTLUilpVRxIaUrSMSlECmpZLWUKsFG5PPzd81kpy5uGBn8ns0HOD7sKuEK4DAKdKRp3edqE+m/njLGQxRZGwxOyocoZABdQ0JOzU1c1zA+/LfR+Ue5fnH1eLih4TQXsd83Ur4ChA1MokoCWWIegOGHhCl8r3J08N7wPGv8x4kVwAqIDHi8rvH9FanqL02DfFoUWs6lVSsC2AgS7HgFnZkfv6hpevqRYxlr2EuIxa/htWsT6OsrlB+P5iA29Pn4sUOgFdAZtu6GzIPzRgNBFOgCpwwBxJHTEiQ0G5Abd91E1dcZSABHDo8AAtVE3iEGVJTgQn192fLjXKoYYY1/BVgBrIC20NjmUqm9HpuDMRLEC0MTSr788CiBZMb4fkU8ef5EfcstBOiuZSQkUVACxd9eqg5BUQQpAb4d8pwYVgArIFzUUpsOHcoJr/DDZDDo1yiPyVl4CgNgAZKThv3KZMUfj9U2XX0h4P0KcI73va17c/WwAlg5wWqwV/hW1vdgiOSiJ4thnGWPAWY5Q8JPJSuuG6pufPeFgMfHKQLL6mEFsEKibKuaydH7Mr73cDIYBpmy54GFPQIzgiBmZiOyUulUMv2vE/VNv0cr6Aksq4MVwIkhCTBS6y/GjClFxZUNUILYtsUjIhLaGPIdl2Qs/R+j1U1vWslwyHLiWAGcGLodEHWj/d+eyme6E0JIZtbRwCeYAwcRErwgeI1BRMI3Blo5TjyZumO8punt4XDIVup4FrFf9gkQRXgSUJgoFP5GufE7g6oogUeIivkBxQ6gPLOLiCC0MYYdV8aJvj2pkKTR4a+FItB2svvMY3uAEyScC8jayeEfzBZyd1QJoRjQQThcKV4NReMv00YQHy2MMZyTjknEKv5lor7lk9Eqcbv9/3nGsV/w6sAMEPyxK+fyuXFHSMHMppQcFnUGkTOIixntDEAQCcOG5oTUFYn0tdP1Lf93B0AdYYDcc/KJXiDYUIhVIgptGGlobquKVeycFcJnZklL5q5zFCxXdoiAILLOryFyZnPzP5wc6btiEzB1D6AuPUrskGXlWAGsIlGM0HB9y+frU5UfmzDsCcDhI9RvCAOoAzFEU+WgU/BrpHTmc/N78v7k2xrHZp86VgCdZWVYAawiUQAbADPWuO4/axPpyyeMLhcBg0FFowcYHBTTDY6U5ryG4aelVCafGfYyc++omR7fZUWw+tg5wCoSmrEBgDGdeedMdv6BSqEcExktF6u5FfN4i7ODMHsgfMCCoOa11sZNNFGy8r9HahrfS4C/M9gWyTZcq4T9Ip8Bonj+36TT9Y0V9bsSbmLznDEe0fIWupiZwwrrYIaRJJA2WsxmZz5TNz78aRv+vHrYHuAZgIKsL3nW3NzYYHbq8mwhuz8tpWOYvSVd+4uKn5QmzsREIM2GpoXwq1PVn5psXPv1XeEKtPUQnTi2B1g5S1VrWEDkGTpQ1bSxOpm8KxGLnz1jtCdAziI3UHniOxY+FcyWOah56FcTOZnc3H9P5Pq2b5rGlM0COzFsD7Ai2gWWsUobLZJtmh4+2KvnL83mMw9Uk3QY8Oiw8ocAijuhLr4MQAQisJpi4yXjFa+pTazftb+6egMB+h67or9irACOm3YBdJhLLrm6YQljPYxIBOePjAxP5A69di6b+UkNCccQeeBSGn1pblzeERRfUMyDIZAzxdqLxVMX1Ccqd41UVJxxKeBbEawMK4Djok0CHab5rI9s7Znx3gEQ0NZ2zHF4lMJ46iSm7x9x3jibmflWHcgBkc8IykoUVwCiM4o1QRdFBDGzAJxZo30VS26Mp2rvHkzVbLYiWBlWAMumXQCd+pwtH1wva9fuzLtN9wBgdJ6zrIC1cGIs3oB9hZrR/neN5TM3VjEUEXFQ4wfBSjC4bKE4mgsTSg/CdEuQmtfGF/Hk2lRFxd0D6dqzLw22JbAT4+PAthjLg9C2mbZ0bnGGkmd8F0JMDd/3F4+Hi1hmwevAAHYQ2jYTRvaWhki7YQgdJnwRmoZ7PjpW23IoHk9+0XNceFobQSQWLIiVpsSlcVHgISKAWRBUVvt+Ip5qSgM/7iXvMpqdfcpOjJeP9QIth63tCrs7/JaLr79F1Z/7ATPxxOf7nZmrETQgPho3Mzr3MkIDPxIM0LYLPlTVT9WtieyUfuyJm54Yqmp8SzqV/gYctyJjjBYgWdwPo9w3ROUDoaIPiQgMw/BTQiivkN2XnRm7pHl+fphhd4hcDlYAx6Jtp0Tndr3mwvZ3c81p3ySAxcyBt/T+8prvL34pA3Tmlo/WwW2tz8FrZRFfy8zNEOIUSOcUA2pmUBOkqhEsVMtszyW/+lXHfYfqmi+sVrHbY/HkhhmjfUFhz8yEKNAUUT8QvVOUUwCAmWEAv1JJlZmfe2BupHfbOiAPm0B/TKwAjkq7AHbwhguu2lCo2vQwxdKV8OY5nu3dnvHdnEhUbNCsmsB6E4RqJlALC9VCQlQLJ6FIuiDpgEgGDbnRYOMBxgMK2cHKzPCr9z7wyBOETt2bSKytrKj7biJRsWUqjB8CgFKcECJT5shlRJE6GEwEaLBfR8KZzM3dVj/c9x4bO3RsrACORtj6N1/yxR/JdPPrjDfvg0kwfCKZIpIxkFAgCpcFWIN1AdB5GO3Nw+gpAg+Q0X2k8yNS0iHJOAjWvfHJ/u7u7hsngNKC2cOoqj6lMf1vyXj69dOAB2a1YCuwRQLAokESMYOJvGrAGZ+f/sum8aFb7Hzg6FgBHInQ+NddeM3bTc0Z3zZc8MEsBREZrZmAeRg9TuB+GN0jTKFXER8kxiBrr59kfMjh/skn7vvc7JHfhIvpkfdgq7y0fZtp6+hUN9fPfbUukfjDKQpEEI59iA93igILhQCAjSTBwit4Xm7qJfUTE7+284EjYwWwJEzADmo6fy4hqjY+TomaDazzmmRcifzkoyI7egURMvX+4EhX162ZY16rrVNs2T8pphtyRbfzvtG4wSk1Bp1tZkEcdMhwbcsXapMVH50R5BnDiijYe7gogPJks9KUIHSmsq5QSs5mZn9aP9y7rRMQtlz60lgBLEXk9XnpZz5BNaddzzrjA4Bwkopn+7838POPvaX0YiZs3SHPGYUorK8tfp/7eiYYDTDYvUMvZeARBODV5787NcStNXOJuk0p8uOPrf/bn1An9Ghdy99XJys+NU0UZJehbDgU/LVE7FCUcMB+FUPN5GevqBsZ/Dc7FFoaK4DDIQA488z/nZ5pfPGTlKhuYt9jEIxwksqf6f1O3dTcO7orKyXWrSugc/tRjSow8I+lnnbSdVo6razcNZrkOiKxEcJdo0HrQNQMoloIt0K4FYhl+/7i6d0f+TKBeLCh9epaN3HdnJC+QSgCWsLwywZBoWdIx4UU2UJmX/3gofMAFMLnrFeoDLsQtpit7RK7O/y5ulPfIRL1zUZnfRApgA2DIITjdXd3FAAA9wfGdupp76pE1cYGLd3WrEw0C5IbIWNrGHodWK5/XMgGCFlPwkkJlQCpWDhxJig2gPFhdB7sZ33KTU+g4PcQgJtOe12sZd+PPjtU20J1qYprp4k8DuYEVG7wAMJ84iCQOqy5IrOsdbUbP32sruWtDeOD3+Jo3cJSxPYAh8HEILRectP9lGx4Kfs5A4IEsyYZl+TNPEje3DcMuWca8AYSsXUg0QBCPQk3xioBEjGQkGHKig82PljnwH7OADxBxgwR/HHBfAhG95LO9wnQwThMf81MV//93Z0TxbsJXZmDdc3X1icrPzkN8oDQO1SeYFmWbxaNjpih01KK2ULmvoaBQ5fYyfDhWAGU094u0NFhNp37gfNz9S9+GMop37WdwMwQishJg8hF0fVpfEDnAJ33wGYcxowB3A/j9Qr2exR0D3uFHsPZkRT8ofMevH6q86jj8aJ3CAxQF7aoC9HljTWuvaUmnvrAJCPILosWjLm85hAxlSo0MojgaN9k52df0jw1sseKYCF2CFTOriChvVCx4Y0iViGMzvoAhd8RM0gQ2Pd5bvBhEHqIcAisR6BxQIjCEBeyg7VOZuwP7r1+uuMoRvab4HqErTsksA1b5p5c0BB1pXcw0F4WP9TlCQA3j/T91Qeb1p9eEU+9Olox5vJGPxj/UJRPSWBiZj/luMqLOZcD2IMwaX+1v7rfVqwAytkdGAY7yUtpqekiEUMbTs49fcXTD9+4b6lL9AN4DAh6k10QmGulLWXPR9u3I72Dg/e71HQtvkj5WwI497wP1NS7qvbvum5++l3zE1dIIR+Mu/ENOaNN0dajqiph4FzJV8rkgcCQlwH4LKzxL8AOgYoEw46tW/8i/SRvfopilc1sPANQKWSc4JNwlZze/47e9WfejpG9zpa51sOGMl0AkB5gbNth0EHHDJB72Uuvqp1xaupzfq6VRGKdEaIZQp2ipTpFa6onSU2Om6hx/bmv7rvnyg8dqmm5pCaZ3OVLBwYsFqwNFy8bxkgw2BFCeF5usE5nT6fh4XkuBVi84LE9QET7DkIH+EC2aj2SqpGNz6VpJRCl5oIk2E1tRWfbTmyZ1F1d7/OOeM3dHWgHxB2XXFWVLcRaPDe13menEcApLOQpMNTUSmiFdBqZVI1MxBxIF6RcEEkIZkjWYFMASMDLZ5sYIJocvHdYtFxbn6q8ZpzhC0CG9xcJIewFgh7AZ2ZANA563noAv8Yy8plfKFgBRHRvDuOL5UaSMcEwGsXkkig+30gYH1rEX08g5i54OwH5yUuurtWe26Ip3miUu45JbDAsWwhyw60kWkmKBihqgJOUEDGQcFAM/Tc+YAognYPRuSz7mUnK6AEJPQLW/YL4EBndTwV94KWZX/0iDICTGB/8zLhUb04m0ufnjA48VcGtcnGFOJgDgwGdICF9xNegJAALrABKhMkrBV+1kHABk+Mw2BhA0bdObAoM6W5sueTGHxiI5AeF28CEFlKyFioJkm5o4DI43WhAFwCdA/vZHMz8KNgMwHgDMF4PIHqk8fuEyfeA5JDDuYl9D3TMLHWLB8v+JsAb8/2/Edr/L5BYFCEddgSBP4gBZlcIgEwzAOyyAihiBbAYN5Yu1fJkLuUjlrlDSTBSzW+UMgmwAft5QGcAbzYDX4xAe6Ng7mVCH4zpNb5/QCr0y9zEaEV2cri7+5a5Y95HOwvs2iW2zD1J2ewAAUAi0cpd6QGmxs3cvrfTre/u/PGwWvfTykT6lXNGa2LI4p1HN8tcjBKiQkEAwLbV+aaeF1gBLEJIFTdLNpDBeDqqaQs/69Hc4M2kCweM4d4YFYaS/vjgmlpn/H92fWH+6ANsAtr+XWL/pNgCIDJwAOhOtDLSA4yOHQbo8I/kIfr7aB0hl7vOuPFXkhBRsvCiWw7+ZGIIqTQA7FrOF/ECwQpgEX42My+TUfX+xaHGwfoUAVrIhMNm9On++6+6pfz87uh1oYGfU2bcQJmBd+41QId3NBdoGyAfftHVtX6yutZ4/lpSaoOBux5KncrGn1s329fevecLd5+dSv+6QsbPzrI2AIkFiWPhjRsGWDlTALDNToCLWAEswhV6Vkd7W5QFHpcggFkw+2Cn4u9Oe9GVne7pr5guPDxIrjvB3YlWLgtz1t1Hea8tW7Y4k+62GiPqW4wR60g5a312WpnMJkCs+Tlks5GyAaSqRNJ1hIoBQkEIAZCDscz47kuBb/cbszPO3J4FGTBEcU24KFsS80YzU6EvfGsrgBArgIjGbgYAR1Gv1nkwkaBi0c7ykTUBRIKN54tkXV3GX/eRfZ3bP7ngWmGzfvHFH0lkk3W1k1P5ZnZjraTiLT7ERsFiLQvZOiTdNQxTD5L1pFKAiAHSKSWBGR/SeGCdB/u5vPFmJ8DUT4JG4GceOnX2wF1PAVA577uzSn2apSODeA2Uz2JYCSLP6Kl4LmcFsAgrgIiwvo9jpvZn/KY8uckYjOGSNUZTyXCUzSSMn2V2qz+05qLrf8YwDhNtEFKtBdR6Fu66QyRb2Ih6VMtKEnGQigNCFdetivnBfg4ozM8Dc+Ns/AFiM0zQB4j1IZd50Pf9QymRHUt4g6MPdd06HVlvb/i7cXrg8ZH4+qeSyj0zx8YQqDwBwbggqY15unJ2dsIugi3ECqBIUNKk+ZeP9E1fcsoBInUWQy9RnwRAGHEDNiDpJE2q8S6SLqSTDheUCQQDNgas84CfAfT8FHmzI2z8CQj0gukgmUKf8b1eV8pB9iaGq3O5kcf2HGsCjdBDtENgN8w96BAE+MMGD8UJZ+aZDEoBoQSAXQJnYe4N1xBsSHQZVgDltO2Uuzu3+63m8gdJyDPZRMZUbDSLObwIDzCzAQmwNz+jszOPM/tGER9UMAO+0T2O5oMK2ZGYmenfPH/XxO3d3YUjGXgPwrdo+3eJkQYqd4ECkRv0DEZ3J2N3hw8AFdgigS4Qm+7gbGYubdDKBJCnNcH4PwovY1v/MqwAygkXw6Q3c6fR3nvCUIjDXOthHH74IAzEJ0Gx2UevPPToLY8c6fLBhDjIEV7KBRr5+XFOm0En6WMFyb3p5R+v+J0w6b7gygET1lAvV6dDQmb83EBB8M/CU20wXBl2RXAhBIAvuOCPqocrXvwUJerqoT0DgjjMIxrBAGAMVFxQfrpHTD368r63fHkQv/wHZ8to3ACBkScSrVwMktsNc6wqcgTgpS+7snJcpBoFVbXmjGjxBW0ikWgxwAYmuVbEEk3x3PQ9B37+4T/sr215bXUq/V9ZkhrgIN2M2a8hoWayMzfVjA58+B672+Rh2B5gIYy2nfLRzu1TrRed8W2kmv+KTcEAomw/AKYyr1AUji/Yy2qK1aw3lWd/9+XffvNl9z3x/dmjteDt7RBfu+OqqlhSNWd1olErWus4iU0snBateQNJ0doH2QhCA2TChYxDSAdECoIANj6EdKD9+QsBwM1nCkimUOyxggRJOe/nPZnNfxkAttnW/zCsABbTuZcBIJkf+tJ8vv79UHEBo8O4UGKUF/Uvg4QQxs/4Itly4f76S28/xYttVzXrHFbVDfNGtgqlNhjhrCGiU5nEhq/8RNVzrWwqENWSSkqSceiwipxgBrMGRTFEulAgPzfORo+x0b2K0UvsDyk2+8/3ev+7B4APiFKCGASB/UqSakr732+YG/+NrQqxNHYItBRRPdCLrv1Xrj71j9ibDzLD6CgTSI5CkNlAxCTyU31EIsbCqRcqSUK5gY8fIhw1acB4MH4W8PMZgh5n1oNE6CdQr/ay/YLpgEv+EOnZoVRmfOwPHvvSYZlmUXrXQH3zG6sTFT/IkNDELCCEcT0PvjdzYc3o6KM7bW2gJbE9wFJ07mWAKTb7vmuysdq3wk0lYLywSO0Cd2j5BDl0E5FknTeIVa0FANaFjPazOfbmJ4n9IQb3KuOPsfYPkqBex8v0kDc52OgUJh984OaZo7logkyz0AUa8sDuO+lCdHlC0FpHiCAXnqCrQWqyUPhaw9joI7b1PzK2BzgSUWnEizo+qqtO/wLrvAdmJxphH5ZRUvIRRYlYGuQIyk/tSU0+9bY19bWHdoeuyyMTuUD3UhCzuQtbw2d2L35pWJKdw3WAkcbW62oTlVdPGVNwBCkUCtPSm92cGhsbAuyWqkfCCuDIENp2Cu7cblpf/vmfUMXabezNhzWCFhOuEvOCI0RgAxkXlJvaFZ/+xdv377ltBK+/KYbsxGGt8VYsMvJleIrC95EE6OHm9d+viaXeNG04X0smNpWb/bO6kcF/sq3/0bECOCpRefT3b/CqLujiWEUNdIGDqlZlRl8aCJXcQ8XAUdbkpCTlJ/fL8f1tPY997iFsvUdh965jGji3Q5x/91VVsznVSCLR6AlnnSax3gh3vRKqzs1MfOFA16ceuOu002Ivm/f2Sjd5ahLAfG7urtrh3sut8R8bK4BjEQ6FNmy56o1e5ek/YKl8GF+WlS1ftEBG4WJs6RkGa6ESigtzczzb/ydDXR23hyfS5nP+tMavWtuY89RaVs4aqNhaAzqFQRtZxhsYaAJRDcmYQzIOSAcggnAq4Iw/+r0D937sLb9uPOW8BoWHnFhMIZcZkd78i+zQZ3lYASyHsFjumos+80Gu3HQTs+fBaFVeqzYkEEHgMQ3/Do+DNUlXspcF52e+A5JpSHcdE+pIqBqhkopkDCQdBL4dDrLNtAf2s2A/nwd4XLI3AlCvIvQ05oa++ssHPrNnsG7dn9elkrfkjRG53OzljWNDd9nWf3lYASyXUATNF117nazadLUxBQ+s1ZJfYbnZA6CoWwjEQaQSxOAgIR4EZg+svWkyeoqNHiRgQBhvkAwOCWEGVT5zUGB6MOV743sevWmq7PJgAINN6+5oTqR/f3Ru8lONY0PXst0ZZtlYASwfigrntl702RupeuOHjc55MKxK32J56HT5H8XwnDBcnzWTgDReJpEd/mhGy5+Bdba+8MTEnj23zR/zTtpZ/Pmd75MtXS36nelba1uqEiN5Nnc0Dhx8WxjtqW3I8/KwAjg+CG07BTq365aLr/9Hqtz4l6yzHtiUDYfKitYiyiAu2n/4DAPMBqQIfuYxN9P7R4cevO6RYNtVAG2dYsEWq8VdKHcwSjVDFQH+SPPGTysy7xyoSb9oc3e3D9iN8Y4HK4DjpyiC1pd/7ouUXvshY/LhnECUTXzDtICy+gzF8znaCdswZIJQmPdUdui9vQ9c841g0r30rjER4YocpteurcnnzD+P6viHzp3c38O28O1xY3eKP34YndsN2nbKgfs+/mGaevp6QY4DEgYc2i2VFecprh6XER0iSfCzhpyY0hUbvr7momt3BBtuCA5csEuzI0xQGNCxjSMq9clzJ/f37Awmvdb4jxPbA6ycYk+w5mXXfhIVa681IAP2Udo2svTaIEgtSqqJfoVTZNbMJI0QMYnM4P9LDH/pT/ft25ePyrUf60ZsmuPKsQI4MYoT45Yt7e8VletuNSpG0AUd7JARDdejJJXiptcgMC0oOhEkcvlCJRyeG/yJ6n3wbT0935qM1iGOdAPW+E8MK4DVIHSRbnrxJ96UrzzlNnYrKllnfSJRDJsIw5Sjvyko4rkgvZLCICKPnKSDuZE9NLzn8v59/9R3LBFYVo4VwGoRimD9eR/b4lefcjsStRtZZ30wqcDiy/IoEQkiqDARpVWWegzWQiWVmR97isd//ZqhX99yyIrgmcEKYDUJRXDq5j9el6t9yXc42bSF/YwHsLMwjLosoyx4TKEEotorANgnmVScGduHicdeNdh9a08wMT72nMCyfKwAVpuwpT7zzJdXzNe/9ZucXvNm7Wd9YpYlO8eCpQEsaP3LYU0qqczc2BPJ2b2v3L/nyyNWBKuLFcAzQmCkBKD1d264GRXr/8roggb7AhBlWbul5bLS+hZoQW/B8IRKOHpu+OfpkR+9at+7fuihgxh24rsq2HWAZ4QOAzBxO4v+X3ziSpra9wkCJIQDsAlbb6aFa13Rg+KKcvSEMjrriYqW3800vOaf0UEGW9vls/M5nv9YATxjEKODGFvbVd8Dn/4/YvLpd8PPeZCuABtdjJQDQlsPS8oFSfelxPugM3DYz3ioaH1Xy0t3XIndHT7adloRrAJ2CPRssOUrDrre561/8cdf5Vee/h+IpavYy2oIIYHF1YbKh0JRAF2Ycywks5/31OzTL+vruuExtLVJdHZaz9AJYHuAZ4Ou93nY2q56Hv7c3WriqcuQm+onJymZ2QeAUhXqIiXjDx4RCALGg3DTcT/e+tU2QAJtgG3ETggrgGeL3R0+trarnsc+91BsZO9lnJ08JFRcwWhd3Ni9NPKJ1FBSBoMBIVlnfUo1XfSzi254Hzq3a7TttP+HJ4BtPZ5twrWCdZuvPFXXnnU3x6s3sJ/VJIQsmnqpCBeKR4I/AkHIGJCbHm2cefKsRx/94nTw3JGjRy1HxrYezzbhBLZ3781P09ie13B2qk+ouARzNJYPR0Rl9kyhBIIYU4LJG0rUNo3Gmv8MIMbWHXZCvEJsD/BcEeUZn/vB803d5p+Sm6zkqOLEwqgJoHxhIJgjM2SMdGb8UKLvjrMPHdqVj1xJz/Kn+K3H9gDPFeGcoP/xf9ijsj3b4RcYpBgMs7D4HAAU/UChnRNBF4yKV2/06191GUBs5wIrw35pzyW7O3xs+XOn94FrfyyzvX8thJKgMKmFaJFnFAt9QsQM6bKJpd/6bN/28wkrgOearls9bL1H9d6/40bM932HVFKxYbOgCHX5cCjqCxiCYciQ+t2t2KrQ+XYNO6Q9bqwATgZ27zIAU2zusfcjOzYilEsADKjMoA+LkADB+IB0Ng2cd876QC3tVgDHiRXASUGHwdYdcv+e20YoM/ox4qgy1oI+oPwngI0RKu5mnNqNAIC2biuA48QK4GQhdI/2/6rjNmSG7oVKSDCbsmWwSBDlqcUGwgGr9EYAwMg5VgDHiRXASYj0x9rJzyGocsJUdIqGqwFRP8BgkJDwjal4Lu/3txkrgJOJzu0a7e2i54EbfoL81M/JiQsE9T0XrwuUuUkJYPv/uFLsF3eysSv4P5F66lYyGkzEC3LFosFQWakVn9kugK0QK4CTjd07NABUz4/8p85NjBMpVcwcoKiQEAhREXZmuBK55/KWf5uxAjjpIEbbTvnYY1+aJF24G9IBB4tjpfF/yT8kWHuQrA8BCGqIWo4LK4CTkaAwLikv80PoIEauLFA6DJVjgISAl9HSnwkEEG7xalk+VgAnI7thALAwU/ejMKOBoMrcwgBRMJEE2BtukE8cDI52WAEcJ1YAJyWBIZ89/f0DZPxeEorAMFTsCBgAGQgFAf+Rrq47M2jnxfVILcvACuDkhNHO4kf79uWZvadBEiTKq0aEO3YbA/LyPwaA8r2DLcvHfmknK6FBk/H3B5tSljfuDCIhUZgpCH/8TgDRsMlynFgBnOQImJEFFRODtl+TiIG8ud29XZ9/Ohj+2GpxK8EK4ORnEoYRFtItxoSyLpDIj30JgB3+nABL7HpuOZlgZh3EvhW32DBCxoTJjP+mif7nzj4wYTfZHSFXiG05TnKkEi4RQNG2YsHOGuQUZm/o6urybEL8iWEFcJJjfF0ZbDBMDLAvRFyZ7OivLn7wU99Ee7vA7g7b+p8AVgAnOb42VaUtx4jgZaGyIx/tBDS6bQLMiWIFcLISxvWQE98YRj9okgkpskNf6X3osz8L9iGwdUFPFDsJPjkhdG7XWwH1pHRPh/EghBvjzPCh1NT+j6OdBTqs3381sD3ASUmQ3D50wYfWgtRGgBle1sjM4B8+8cS/zKJ7O9lSiKuDFcDJSNtmAoC5eONL4KRcAhFlhz/e9/ANP8XWdmWHPquHFcDJSBAODXLcV8p4HVF24J/6H7jmxqic4nN9exbLMwwTA9TyipuHWl/xDw9uAZxwRxjr9VllbA9wstG2UwLEm17x2f8FU/CSsw+/sQvkhckudty/ylgBnGycs5e3bm1X2pu/LIbJ39v3yNdG0fY2aYPdLC8Yzmlrd190yZUNwaN220hZXqhY47e8YGE74bVYLBaLxWKxWCwWi8VisVgsFovFYrFYLBaLxWKxWCwWi8VisVgsFovFYrFYLBaLxWKxWCwWi8VisVgsFovFYrFYLBaLxWKxWCwWi+X5yP8H7F5KbU1P+dYAAAAASUVORK5CYII=";

        [STAThread]
        public static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            try
            {
                string browserPath = GetBrowserPath();
                string appDataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "DNA_AI_Platform_Data");
                
                if (!Directory.Exists(appDataDir))
                {
                    Directory.CreateDirectory(appDataDir);
                }

                // 1. Ekstrak icon resmi DNA AI ke disk lokal
                string iconPath = Path.Combine(appDataDir, "dna-ai.ico");
                try
                {
                    byte[] iconBytes = Convert.FromBase64String(ICON_BASE64);
                    File.WriteAllBytes(iconPath, iconBytes);
                }
                catch {}

                // Argumen untuk membuka jendela mandiri terhubung dengan profil akun pengguna
                string launchArgs = string.Format("--app=\"{0}\"", APP_URL);

                // 2. Buat Shortcut di Desktop dan Start Menu dengan ICON RESMI DNA AI
                string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string startMenuPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs");

                CreateShortcut(Path.Combine(desktopPath, APP_NAME + ".lnk"), browserPath, launchArgs, "Aplikasi DNA AI Platform", iconPath);
                if (Directory.Exists(startMenuPath))
                {
                    CreateShortcut(Path.Combine(startMenuPath, APP_NAME + ".lnk"), browserPath, launchArgs, "Aplikasi DNA AI Platform", iconPath);
                }

                // 3. Jalankan aplikasi langsung
                if (!string.IsNullOrEmpty(browserPath) && File.Exists(browserPath))
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = browserPath;
                    psi.Arguments = launchArgs;
                    psi.UseShellExecute = true;
                    Process.Start(psi);
                }
                else
                {
                    Process.Start(APP_URL);
                }

                MessageBox.Show(
                    "Pemasangan DNA AI Platform Berhasil!\n\n" +
                    "• Icon resmi DNA AI telah dipasang di Desktop & Start Menu.\n" +
                    "• DNA AI kini terbuka di jendela mandiri tanpa bilah browser.\n\n" +
                    "Selamat menggunakan DNA AI Platform!",
                    "DNA AI Platform - Installer",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
            }
            catch (Exception ex)
            {
                try { Process.Start(APP_URL); } catch {}
                MessageBox.Show("Membuka DNA AI di browser Anda.\n\n" + ex.Message, "DNA AI Platform", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        }

        private static string GetBrowserPath()
        {
            string chrome = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Chrome\Application\chrome.exe");
            if (File.Exists(chrome)) return chrome;

            chrome = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Google\Chrome\Application\chrome.exe");
            if (File.Exists(chrome)) return chrome;

            string localChrome = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Google\Chrome\Application\chrome.exe");
            if (File.Exists(localChrome)) return localChrome;

            string edge = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe");
            if (File.Exists(edge)) return edge;

            edge = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe");
            if (File.Exists(edge)) return edge;

            return "chrome.exe";
        }

        private static void CreateShortcut(string shortcutPath, string targetPath, string arguments, string description, string iconPath)
        {
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType != null)
                {
                    dynamic shell = Activator.CreateInstance(shellType);
                    dynamic shortcut = shell.CreateShortcut(shortcutPath);
                    shortcut.TargetPath = targetPath;
                    shortcut.Arguments = arguments;
                    shortcut.Description = description;
                    shortcut.WorkingDirectory = Path.GetDirectoryName(targetPath);
                    
                    if (File.Exists(iconPath))
                    {
                        shortcut.IconLocation = iconPath + ",0";
                    }
                    
                    shortcut.Save();
                }
            }
            catch {}
        }
    }
}
